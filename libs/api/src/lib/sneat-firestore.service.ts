import { Injector, runInInjectionContext } from '@angular/core';
import {
  doc,
  getDoc,
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  query,
  where,
  onSnapshot,
  limit,
  QuerySnapshot,
  QueryOrderByConstraint,
} from 'firebase/firestore';
import {
  IIdAndOptionalBriefAndOptionalDbo,
  SneatUrlOperationBlocker,
} from '@sneat/core';
import { WhereFilterOp } from '@firebase/firestore-types';
import { INavContext } from '@sneat/core';
import { from, map, NEVER, Observable } from 'rxjs';

export interface IFilter {
  readonly field: string;
  readonly operator: WhereFilterOp;
  readonly value: unknown;
}

export interface IQueryArgs {
  readonly limit?: number;
  readonly filter?: readonly IFilter[];
  readonly orderBy?: readonly QueryOrderByConstraint[];
}

export class SneatFirestoreService<Brief, Dbo extends Brief> {
  private readonly operationBlocker: SneatUrlOperationBlocker;

  constructor(
    private readonly injector: Injector,
    // private readonly afs: AngularFirestore,
    private readonly dto2brief: (id: string, dto: Dbo) => Brief = (
      id: string,
      dto: Dbo,
    ) => ({
      ...(dto as unknown as Brief),
      id,
    }),
  ) {
    if (!dto2brief) {
      throw new Error('dto2brief is required');
    }
    this.operationBlocker = injector.get(SneatUrlOperationBlocker);
  }

  watchByID<Dbo2 extends Dbo>(
    collection: CollectionReference<Dbo2>,
    id: string,
  ): Observable<IIdAndOptionalBriefAndOptionalDbo<Brief, Dbo2>> {
    if (this.operationBlocker.isBlocked('server-requests')) {
      return NEVER;
    }
    const docRef = runInInjectionContext(this.injector, () =>
      doc(collection, id),
    );
    return this.watchByDocRef(docRef);
  }

  watchByDocRef<Dbo2 extends Dbo>(
    docRef: DocumentReference<Dbo2>,
  ): Observable<IIdAndOptionalBriefAndOptionalDbo<Brief, Dbo2>> {
    if (this.operationBlocker.isBlocked('server-requests')) {
      return NEVER;
    }
    return new Observable<DocumentSnapshot<Dbo2>>((subscriber) =>
      runInInjectionContext(this.injector, () => {
        if (this.operationBlocker.isBlocked('server-requests')) return;
        return onSnapshot(
          docRef,
          (snapshot) => subscriber.next(snapshot),
          (err) => subscriber.error(err),
          () => subscriber.complete(),
        );
      }),
    ).pipe(
      map((changes) =>
        docSnapshotToDto<Brief, Dbo2>(docRef.id, this.dto2brief, changes),
      ),
    );
  }

  getByDocRef<Dbo2 extends Dbo>(
    docRef: DocumentReference<Dbo2>,
  ): Observable<INavContext<Brief, Dbo2>> {
    if (this.operationBlocker.isBlocked('server-requests')) {
      return NEVER;
    }
    return from(getDoc(docRef)).pipe(
      map((changes) =>
        docSnapshotToDto<Brief, Dbo2>(docRef.id, this.dto2brief, changes),
      ),
    );
  }

  watchSnapshotsByFilter<Dbo2 extends Dbo>(
    collectionRef: CollectionReference<Dbo2>,
    queryArgs?: IQueryArgs,
  ): Observable<QuerySnapshot<Dbo2>> {
    if (this.operationBlocker.isBlocked('server-requests')) {
      return NEVER;
    }
    const operator = (f: IFilter) =>
      f.field.endsWith('IDs') ? 'array-contains' : f.operator;
    const q = query(
      collectionRef,
      ...(queryArgs?.filter || []).map((f) =>
        where(f.field, operator(f), f.value),
      ),
      ...(queryArgs?.orderBy || []),
      ...(queryArgs?.limit ? [limit(queryArgs.limit)] : []),
    );
    return new Observable<QuerySnapshot<Dbo2>>((subscriber) => {
      if (this.operationBlocker.isBlocked('server-requests')) return;
      return onSnapshot(q, subscriber);
    });
  }

  watchByFilter<Dbo2 extends Dbo>(
    collectionRef: CollectionReference<Dbo2>,
    queryArgs?: IQueryArgs,
  ): Observable<INavContext<Brief, Dbo2>[]> {
    return this.watchSnapshotsByFilter(collectionRef, queryArgs).pipe(
      map((querySnapshot) => {
        return querySnapshot.docs.map(this.docSnapshotToContext.bind(this));
      }),
    );
  }

  docSnapshotsToContext<Dbo2 extends Dbo>(
    docSnapshots: DocumentSnapshot<Dbo2>[],
  ): INavContext<Brief, Dbo2>[] {
    return docSnapshots.map((doc) => {
      return this.docSnapshotToContext(doc);
    });
  }

  docSnapshotToContext<Dbo2 extends Dbo>(
    doc: DocumentSnapshot<Dbo2>,
  ): INavContext<Brief, Dbo2> {
    const { id } = doc;
    const dto: Dbo2 | undefined = doc.data();
    const brief = dto && this.dto2brief(id, dto);
    const context = {
      id,
      dbo: dto,
      // Preserve the legacy runtime alias while satisfying the declared contract.
      dto,
      brief,
    };
    return context;
  }
}

export function docSnapshotToDto<Brief, Dbo extends Brief>(
  id: string,
  dto2brief: (id: string, dto: Dbo) => Brief,
  docSnapshot: DocumentSnapshot<Dbo>,
): INavContext<Brief, Dbo> {
  if (!docSnapshot.exists()) {
    return { id, brief: null, dbo: null };
  }
  const dto: Dbo | undefined = docSnapshot.data();
  return { id, dbo: dto, brief: dto ? dto2brief(id, dto) : undefined };
}
