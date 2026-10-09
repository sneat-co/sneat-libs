import {
  Injectable,
  inject,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import {
  // Action,
  Firestore as AngularFirestore,
  CollectionReference,
  DocumentSnapshot,
  collection,
  doc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { SneatApiService } from '@sneat/api';
import { IUserRecord } from '@sneat/auth-models';
import {
  ErrorLogger,
  IErrorLogger,
  SneatUrlOperationBlocker,
} from '@sneat/core';
import {
  initialSneatAuthState,
  AuthStatuses,
  ISneatAuthState,
  ISneatAuthUser,
  SneatAuthStateService,
} from '../sneat-auth-state-service';
import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs';
import {
  IInitUserRecordRequest,
  UserRecordService,
} from './user-record.service';

export interface ISneatUserState extends ISneatAuthState {
  record?: IUserRecord | null; // undefined => not loaded yet, null = does not exists
  /** Ready only after a matching persisted Firestore user record is observed. */
  userRecordStatus?: 'loading' | 'ready' | 'failed';
}

const UsersCollection = 'users';

@Injectable({ providedIn: 'root' }) // TODO: lazy loading
export class SneatUserService {
  private readonly errorLogger = inject<IErrorLogger>(ErrorLogger);
  private readonly sneatApiService = inject(SneatApiService);
  private readonly userRecordService = inject(UserRecordService);
  private readonly operationBlocker = inject(SneatUrlOperationBlocker);

  // private userDocSubscription?: Subscription;
  private readonly injector = inject(Injector);
  private readonly userCollection: CollectionReference<IUserRecord>;
  private readonly userDocRef = (uid: string) =>
    runInInjectionContext(this.injector, () => doc(this.userCollection, uid));

  private uid?: string;
  private pendingUID?: string;
  private currentAuthState?: ISneatAuthState;
  private pendingAuthState?: ISneatAuthState;
  private deferredMissingUserDocSnapshot?: DocumentSnapshot<IUserRecord>;
  private $userTitle?: string;
  private watchTimer?: ReturnType<typeof setTimeout>;
  private watchGeneration = 0;
  private accountGeneration = 0;
  private initOperationID = 0;
  private activeInit?: { uid: string; accountGeneration: number; id: number };
  private initAcknowledged?: { uid: string; accountGeneration: number };

  private readonly userChanged$ = new ReplaySubject<string | undefined>(1);
  public readonly userChanged = this.userChanged$.asObservable();

  private readonly userState$ = new BehaviorSubject<ISneatUserState>(
    initialSneatAuthState,
  );

  public readonly userState = this.userState$.asObservable();

  private _unsubscribeFromUserDoc?: Unsubscribe;

  private unsubscribeFromUserDoc() {
    clearTimeout(this.watchTimer);
    this.watchTimer = undefined;
    this.watchGeneration++;
    if (this._unsubscribeFromUserDoc) {
      this._unsubscribeFromUserDoc();
      this._unsubscribeFromUserDoc = undefined;
    }
  }

  constructor() {
    const afs = inject(AngularFirestore);
    const sneatAuthStateService = inject(SneatAuthStateService);
    this.userCollection = collection(
      afs,
      UsersCollection,
    ) as CollectionReference<IUserRecord>;
    sneatAuthStateService.authState.subscribe({
      next: this.onAuthStateChanged,
      error: this.errorLogger.logErrorHandler('failed to get sneat auth state'),
    });
  }

  public get currentUserID(): string | undefined {
    return this.uid;
  }

  // public get userTitle(): string | undefined {
  // 	return this.$userTitle;
  // }

  public setUserCountry(countryID: string): Observable<void> {
    return this.sneatApiService.post('users/set_user_country', { countryID });
  }

  /**
   * Watches another user's readable profile record without changing the
   * authenticated user's state. Firestore rules remain the authorization
   * boundary (for example, shared-Space membership); callers only depend on
   * this user-domain service rather than the persistence SDK.
   */
  public watchUserRecordByID(userID: string): Observable<IUserRecord | null> {
    return new Observable<IUserRecord | null>((subscriber) => {
      if (!userID || this.operationBlocker.isBlocked('server-requests')) {
        subscriber.next(null);
        subscriber.complete();
        return undefined;
      }
      const userDocRef = this.userDocRef(userID);
      return runInInjectionContext(this.injector, () =>
        onSnapshot(userDocRef, {
          next: (snapshot) =>
            subscriber.next(snapshot.exists() ? snapshot.data() : null),
          error: (error) => subscriber.error(error),
        }),
      );
    });
  }

  public onUserSignedIn(authState: ISneatAuthState): void {
    const authUser = authState.user;
    // afUser.getIdToken().then(idToken => {
    // 	console.log('Firebase idToken:', idToken);
    // }).catch(err => this.errorLoggerService.logError(err, 'Failed to get Firebase ID token'));
    if (authUser?.email && authUser.emailVerified) {
      this.$userTitle = authUser.email;
    }
    this.pendingUID = undefined;
    if (this.uid === authUser?.uid) {
      this.currentAuthState = authState;
      this.pendingAuthState = undefined;
      const current = this.userState$.value;
      if (current.user?.isAnonymous !== authUser?.isAnonymous) {
        this.userState$.next({
          ...authState,
          record: current.record,
          userRecordStatus: current.userRecordStatus,
        });
      }
      const deferredSnapshot = this.deferredMissingUserDocSnapshot;
      this.deferredMissingUserDocSnapshot = undefined;
      if (deferredSnapshot) {
        this.userDocChanged(deferredSnapshot, authState, this.watchGeneration);
      }
      return;
    }
    this.pendingAuthState = undefined;
    this.deferredMissingUserDocSnapshot = undefined;
    this.unsubscribeFromUserDoc();
    if (!authUser) {
      if (this.userState$.value?.record !== null) {
        this.userState$.next({ ...this.userState$.value });
      }
      return;
    }
    const { uid } = authUser;
    this.currentAuthState = authState;
    this.accountGeneration++;
    this.initAcknowledged = undefined;
    this.uid = uid;
    this.userState$.next({
      ...authState,
      userRecordStatus: 'loading',
    });
    this.userChanged$.next(uid);
    this.watchUserRecord(uid, authState);
  }

  private watchUserRecord(uid: string, authState: ISneatAuthState): void {
    // console.log(
    //   `SneatUserService.watchUserRecord(uid=${uid}): Loading user record...`,
    // );
    this.unsubscribeFromUserDoc();
    const generation = this.watchGeneration;
    if (this.operationBlocker.isBlocked('server-requests')) {
      this.setUserRecordStatus(uid, authState, 'failed');
      return;
    }

    // TODO: Remove - setTimeout() not needed but trying to troubleshoot user record issue
    this.watchTimer = setTimeout(() => {
      this.watchTimer = undefined;
      if (!this.isCurrentIdentity(uid, authState, generation)) return;
      if (this.operationBlocker.isBlocked('server-requests')) {
        this.setUserRecordStatus(uid, authState, 'failed');
        return;
      }
      try {
        const userDocRef = this.userDocRef(uid);
        const unsubscribe = runInInjectionContext(
          this.injector,
          () =>
            onSnapshot(userDocRef, {
              next: (userDocSnapshot) => {
                const currentAuthState = this.currentAuthState;
                if (
                  !currentAuthState ||
                  !this.isCurrentIdentity(uid, currentAuthState, generation)
                )
                  return;
                // console.log(
                //   `SneatUserService.watchUserRecord(uid=${uid}) => userDocSnapshot:`,
                //   userDocSnapshot,
                // );
                this.userDocChanged(
                  userDocSnapshot,
                  currentAuthState,
                  generation,
                );
              },
              error: (err) => {
                const currentAuthState = this.currentAuthState;
                if (
                  !currentAuthState ||
                  !this.isCurrentIdentity(uid, currentAuthState, generation)
                )
                  return;
                this.deferredMissingUserDocSnapshot = undefined;
                this.setUserRecordStatus(uid, currentAuthState, 'failed');
                this.unsubscribeFromUserDoc();
                this.errorLogger.logError(err, 'Failed to read user record');
              },
            }),
        );
        if (this.watchGeneration === generation) {
          this._unsubscribeFromUserDoc = unsubscribe;
        } else {
          unsubscribe();
        }
      } catch (err) {
        const currentAuthState = this.currentAuthState;
        if (
          currentAuthState &&
          this.isCurrentIdentity(uid, currentAuthState, generation)
        ) {
          this.deferredMissingUserDocSnapshot = undefined;
          this.setUserRecordStatus(uid, currentAuthState, 'failed');
          this.errorLogger.logError(err, 'Failed to watch user record');
        }
        return;
      }
    }, 100);
  }

  private onAuthStateChanged = (authState: ISneatAuthState): void => {
    // console.log('SneatUserService => authState changed:', authState);
    if (authState.user) {
      if (this.isReadyForUserRecord(authState)) {
        this.onUserSignedIn(authState);
      } else {
        this.onAuthStatePending(authState);
      }
    } else {
      this.userState$.next(authState);
      this.userChanged$.next(undefined);
      this.onUserSignedOut();
    }
  };

  private isReadyForUserRecord(authState: ISneatAuthState): boolean {
    if (authState.status !== AuthStatuses.authenticated) return false;
    // Older callers that provide the original minimal auth-state shape remain
    // supported. SneatAuthStateService always includes loadingPhase and token.
    return authState.loadingPhase === undefined ||
      (authState.loadingPhase === 'ready' && !!authState.token);
  }

  private onAuthStatePending(authState: ISneatAuthState): void {
    const uid = authState.user?.uid;
    if (!uid) return;

    // A token refresh for the account already owning this watcher must not
    // replace its stable authenticated identity with a transient auth state.
    if (this.uid === uid && this.currentAuthState?.status === AuthStatuses.authenticated) {
      this.pendingAuthState = authState;
      return;
    }

    // A different identity is visible before its token is ready. Retire the
    // previous account immediately, but do not assign this UID or start a
    // watcher until the auth service publishes the matching ready token.
    if (this.pendingUID !== uid || this.uid) {
      this.accountGeneration++;
      this.initAcknowledged = undefined;
      this.activeInit = undefined;
      this.pendingAuthState = undefined;
      this.deferredMissingUserDocSnapshot = undefined;
      const hadCurrentUID = !!this.uid;
      this.uid = undefined;
      this.currentAuthState = undefined;
      this.pendingUID = uid;
      this.unsubscribeFromUserDoc();
      if (hadCurrentUID) this.userChanged$.next(undefined);
    }
    this.userState$.next({
      ...authState,
      record: undefined,
      userRecordStatus: 'loading',
    });
  }

  private userDocChanged(
    userDocSnapshot: DocumentSnapshot<IUserRecord>,
    authState: ISneatAuthState,
    generation: number,
  ): void {
    // console.log(
    //   'SneatUserService.userDocChanged() => userDocSnapshot.exists:',
    //   userDocSnapshot.exists(),
    //   'authState:',
    //   authState,
    //   'userDocSnapshot:',
    //   userDocSnapshot,
    // );
    if (
      !this.isCurrentIdentity(
        authState.user?.uid ?? '',
        authState,
        generation,
      ) ||
      userDocSnapshot.ref.id !== this.uid
    ) {
      console.error(
        'userDocSnapshot.ref.id !== this.uid - Should always be equal as we unsubscribe if uid changes',
      );
      return;
    }
    // console.log('SneatUserService => userDocSnapshot.exists:', userDocSnapshot.exists)
    const authUser = authState.user;
    const recordExists = userDocSnapshot.exists();
    const initAcknowledged = this.initAcknowledged;
    if (
      recordExists &&
      authUser?.uid === initAcknowledged?.uid &&
      this.accountGeneration === initAcknowledged?.accountGeneration
    ) {
      this.initAcknowledged = undefined;
    }
    const userRecord: IUserRecord | null = recordExists
      ? (userDocSnapshot.data() as IUserRecord)
      : authUser
        ? { title: authUser.displayName || authUser.email || authUser.uid }
        : null;
    if (recordExists) {
      this.deferredMissingUserDocSnapshot = undefined;
    } else if (this.pendingAuthState?.user?.uid === authUser?.uid) {
      this.deferredMissingUserDocSnapshot = userDocSnapshot;
    } else {
      this.deferredMissingUserDocSnapshot = undefined;
    }
    const current = this.userState$.value;
    this.userState$.next({
      ...authState,
      record: userRecord,
      userRecordStatus: recordExists
        ? 'ready'
        : current.userRecordStatus === 'failed'
          ? 'failed'
          : 'loading',
    });
    if (
      authUser &&
      !recordExists &&
      current.userRecordStatus !== 'failed' &&
      !this.pendingAuthState &&
      !(
        this.initAcknowledged?.uid === authUser.uid &&
        this.initAcknowledged.accountGeneration === this.accountGeneration
      )
    ) {
      this.initUserRecordFromAuthUser(authUser);
    }
  }

  private initUserRecordFromAuthUser(authUser: ISneatAuthUser): void {
    const uid = authUser.uid;
    const accountGeneration = this.accountGeneration;
    if (!uid || !this.isCurrentAuthIdentity(uid, authUser, accountGeneration))
      return;
    if (
      this.activeInit?.uid === uid &&
      this.activeInit.accountGeneration === accountGeneration
    ) {
      return;
    }
    const operation = { uid, accountGeneration, id: ++this.initOperationID };
    this.activeInit = operation;
    let request: IInitUserRecordRequest = {
      email: authUser.email || undefined,
      emailIsVerified: authUser.emailVerified,
      authProvider: authUser?.providerId,
    };
    if (authUser?.displayName) {
      request = { ...request, names: { fullName: authUser.displayName } };
    }
    this.userRecordService.initUserRecord(request).subscribe({
      next: () => {
        if (this.activeInit === operation) this.activeInit = undefined;
        if (
          !this.isCurrentAuthIdentity(uid, authUser, accountGeneration) ||
          this.userState$.value.userRecordStatus === 'ready'
        )
          return;
        this.initAcknowledged = { uid, accountGeneration };
        // API acknowledgement is not readiness. Wait for the persisted snapshot.
      },
      error: (error) => {
        if (this.activeInit === operation) this.activeInit = undefined;
        if (
          !this.isCurrentAuthIdentity(uid, authUser, accountGeneration) ||
          this.userState$.value.userRecordStatus === 'ready'
        )
          return;
        this.setUserRecordStatus(
          uid,
          { status: 'authenticated', user: authUser },
          'failed',
        );
        this.errorLogger.logError(error, 'Failed to initialize user record');
      },
    });
  }

  /** Retry record watch and initialization after a failed first-load attempt. */
  public retryUserRecordInitialization(): void {
    const current = this.userState$.value;
    const uid = this.uid;
    if (
      !uid ||
      current.status !== 'authenticated' ||
      current.user?.uid !== uid ||
      current.userRecordStatus !== 'failed'
    ) {
      return;
    }
    this.userState$.next({ ...current, userRecordStatus: 'loading' });
    this.watchUserRecord(uid, current);
  }

  private isCurrentIdentity(
    uid: string,
    authState: ISneatAuthState,
    generation: number,
  ): boolean {
    return (
      !!uid &&
      this.uid === uid &&
      this.watchGeneration === generation &&
      authState.status === 'authenticated' &&
      authState.user?.uid === uid &&
      this.userState$.value.user?.uid === uid
    );
  }

  private isCurrentAuthIdentity(
    uid: string,
    authUser: ISneatAuthUser,
    accountGeneration: number,
  ): boolean {
    return (
      uid === this.uid &&
      accountGeneration === this.accountGeneration &&
      this.userState$.value.status === 'authenticated' &&
      this.userState$.value.user?.uid === uid &&
      authUser.uid === uid
    );
  }

  private setUserRecordStatus(
    uid: string,
    authState: ISneatAuthState,
    userRecordStatus: ISneatUserState['userRecordStatus'],
  ): void {
    if (
      uid !== this.uid ||
      authState.user?.uid !== uid ||
      this.userState$.value.user?.uid !== uid
    ) {
      return;
    }
    this.userState$.next({ ...this.userState$.value, userRecordStatus });
  }

  private onUserSignedOut(): void {
    this.accountGeneration++;
    this.initAcknowledged = undefined;
    this.uid = undefined;
    this.pendingUID = undefined;
    this.currentAuthState = undefined;
    this.pendingAuthState = undefined;
    this.deferredMissingUserDocSnapshot = undefined;
    this.unsubscribeFromUserDoc();
  }

  // private createUserRecord(userDocRef: DocumentReference, authUser: ISneatAuthUser): void {
  // 	if (this.userState$.value) {
  // 		return;
  // 	}
  // 	this.db.firestore.runTransaction(async tx => {
  // 		if (this.userState$.value) {
  // 			return undefined;
  // 		}
  // 		const u = await tx.get(userDocRef);
  // 		if (!u.exists) {
  // 			const title = authUser.displayName || authUser.email || authUser.uid;
  // 			const user: IUserRecord = authUser.email
  // 				? {title, email: authUser.email, emailVerified: authUser.emailVerified}
  // 				: {title};
  // 			await tx.set(userDocRef, user);
  // 			return user;
  // 		}
  // 		return undefined;
  // 	}).then(user => {
  // 		if (user) {
  // 			console.log('user record created:', user);
  // 		}
  // 		if (!this.userState$.value) {
  // 			const userState: ISneatUserState = {
  // 				status: AuthStatuses.authenticated,
  // 				record: user,
  // 				user: authUser,
  // 			};
  // 			this.userState$.next(userState);
  // 		}
  // 	}).catch(this.errorLogger.logErrorHandler('failed to create user record'));
  // }
}
