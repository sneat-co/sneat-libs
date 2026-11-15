import { InjectionToken, Signal, computed, inject } from '@angular/core';
import { SneatLang, SneatLanguageService } from '@sneat/core';

/**
 * Every word `@sneat/auth-ui`'s sign-in screens and menu item say, a COMPLETE
 * set per language (no silent English fallback; `auth-ui-labels.spec.ts`
 * checks key parity). Anything with a name, an email or a provider in it is a
 * function, so each language orders its own sentence. Never build a sentence
 * by joining two labels.
 *
 * Where a template bolds or links a value, the label is the lead-in and the
 * value follows (`signedInAsLead` + name); all six languages put it last.
 *
 * Review: `ru` had a careful pass; `es`, `de`, `fr` and `pt-BR` had no native
 * review yet.
 *
 * Out of scope here: sign-in failure summaries and hints (made by
 * `@sneat/auth-core`; to be translated by their stable Firebase code), server
 * SSO error messages, and the account, SSO settings and phone screens.
 */
export interface IAuthUiLabels {
  readonly lang: SneatLang;

  // Login page
  /** Toolbar title: "Login @ Sneat.app". */
  readonly loginTitle: (appTitle: string) => string;
  readonly joinTeamPrompt: string;
  readonly signInWithSneatAccount: string;
  readonly signingYouIn: string;
  /** Followed by the bold name or email. */
  readonly signedInAsLead: string;
  readonly alreadySignedIn: string;
  readonly signedInWith: (provider: string) => string;
  /** Provider name in `signedInWith` for an email + password session. */
  readonly providerPassword: string;
  /** Provider name in `signedInWith` for a phone session. */
  readonly providerPhone: string;
  readonly continueTo: (appTitle: string) => string;
  readonly useAnotherAccount: string;
  /** Followed by the support email link. */
  readonly helpLead: string;

  // Auth panel
  readonly authRecovery: string;
  /**
   * An OAuth sign-in hit an email that already has an account. The template
   * bolds the email: it calls this with a marker and splits on it, so each
   * language still orders its own sentence.
   */
  readonly pendingLinkHasAccount: (email: string) => string;
  /** The same notice when the provider gave no email. */
  readonly pendingLinkNoEmail: string;
  /** The sentence after `pendingLinkHasAccount` / `pendingLinkNoEmail`. */
  readonly pendingLinkNext: (args: {
    provider: string;
    autoLink: boolean;
  }) => string;
  readonly accountSetupFailed: string;
  readonly retryAccountSetup: string;
  readonly preparingAccount: string;
  readonly signInWithCompanySso: string;
  readonly quickLogin: string;
  /** Provider button: "Login with Google". */
  readonly loginWith: (provider: string) => string;

  // Email form
  readonly signUp: string;
  readonly signIn: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly companyName: string;
  /** Placeholder of a required field. */
  readonly required: string;
  readonly existingAccountHint: string;
  readonly password: string;
  readonly resetPasswordTitle: string;
  readonly forgotReset: string;
  readonly wrongPassword: string;
  readonly signingUp: string;
  readonly signingIn: string;
  /**
   * The lighter tail of the "Sign in with password" button, after `signIn`
   * (styled apart, so it is a suffix, not a joined sentence).
   */
  readonly withPasswordSuffix: string;
  /** Between the two sign-in buttons. */
  readonly or: string;
  readonly getSignInLink: string;
  readonly emailRequired: string;
  readonly firstNameRequired: string;
  readonly lastNameRequired: string;
  readonly companyRequired: string;
  readonly signInLinkSent: (email: string) => string;
  readonly passwordResetSent: string;

  // Email-link page
  readonly emailLinkTitle: string;
  readonly emailLinkRetype: string;

  // Telegram
  readonly telegramLogIn: string;
  readonly telegramUnreachable: string;

  // Company SSO page
  readonly ssoTitle: string;
  /** Followed by the bold "@domain". */
  readonly ssoUseCompanyEmailLead: string;
  readonly ssoEnterWorkEmail: string;
  readonly ssoWorkEmail: string;
  readonly ssoContinue: string;
  readonly ssoNotConfigured: (domain: string) => string;
  readonly ssoRegularReturn: string;
  readonly ssoRegularSetup: string;
  readonly ssoContinueRegular: string;

  // Sign-in failure notice
  /** Followed by the error code and message. */
  readonly failureDetails: string;
  readonly failureOnHost: (host: string) => string;
  readonly tryAgain: string;
  readonly dismiss: string;

  // Side-menu item
  readonly menuSignedInAs: string;
  readonly menuAuthentication: string;
  readonly loading: string;
  readonly authenticating: string;
  /** Spinner `aria-label` (no ellipsis). */
  readonly authenticatingAria: string;
  readonly pleaseSignIn: string;
  readonly signOut: string;
}

export const AUTH_UI_LABELS_EN: IAuthUiLabels = {
  lang: 'en',
  loginTitle: (app) => `Login @ ${app}`,
  joinTeamPrompt: 'Please sign in to join a team',
  signInWithSneatAccount: 'Sign in with your Sneat account.',
  signingYouIn: 'Signing you in…',
  signedInAsLead: 'You’re signed in as',
  alreadySignedIn: 'You’re already signed in',
  signedInWith: (p) => `Signed in with ${p}`,
  providerPassword: 'email and password',
  providerPhone: 'phone',
  continueTo: (app) => `Continue to ${app}`,
  useAnotherAccount: 'Use another account',
  helpLead: 'If any issues get',
  authRecovery:
    "We couldn't complete sign-in. Try again with email or another sign-in method.",
  pendingLinkHasAccount: (e) => `${e} already has an account.`,
  pendingLinkNoEmail: 'This email already has an account.',
  pendingLinkNext: ({ provider, autoLink }) =>
    'Sign in the way you did before — with email or another sign-in method — ' +
    (autoLink
      ? `and we'll connect ${provider} to it automatically.`
      : `then connect ${provider} from your account page.`),
  accountSetupFailed:
    'Your account is still being prepared. Retry before continuing.',
  retryAccountSetup: 'Retry account setup',
  preparingAccount: 'Preparing your account…',
  signInWithCompanySso: 'Sign in with company SSO',
  quickLogin: 'Quick login',
  loginWith: (p) => `Login with ${p}`,
  signUp: 'Sign up',
  signIn: 'Sign in',
  email: 'Email',
  firstName: 'First name',
  lastName: 'Last name',
  companyName: 'Company name',
  required: 'required',
  existingAccountHint:
    'This email already has an account. Enter your password to sign in, or get a sign-in link by email.',
  password: 'Password',
  resetPasswordTitle: 'Send email with a link to reset password ',
  forgotReset: 'Forgot? Reset!',
  wrongPassword: 'Wrong password',
  signingUp: 'Signing up...',
  signingIn: 'Signing in...',
  withPasswordSuffix: 'with password',
  or: 'or',
  getSignInLink: 'Get sign-in link',
  emailRequired: 'Email is a required field',
  firstNameRequired: 'First name is a required field',
  lastNameRequired: 'Last name is a required field',
  companyRequired: 'Company title is a required field',
  signInLinkSent: (email) => `Sign-in link has been sent to email: ${email}`,
  passwordResetSent:
    'If an account exists for this email, password reset instructions will be sent.',
  emailLinkTitle: 'Signing in with email link',
  emailLinkRetype:
    'Welcome to our app! For your safety please re-type your email address to sign-in.',
  telegramLogIn: 'Log in with Telegram',
  telegramUnreachable:
    "Telegram login is unavailable: we couldn't reach the sign-in server (network or site configuration problem). Please use another method or try again later.",
  ssoTitle: 'Company SSO',
  ssoUseCompanyEmailLead: 'Use your company email ending in',
  ssoEnterWorkEmail:
    'Enter your work email to find your organisation’s identity provider.',
  ssoWorkEmail: 'Work email',
  ssoContinue: 'Continue with SSO',
  ssoNotConfigured: (d) => `SSO is not configured for ${d} yet.`,
  ssoRegularReturn:
    'Sign in or create your regular Sneat account, then we’ll return you to where you started.',
  ssoRegularSetup:
    'Sign in or create your regular Sneat account, then we’ll continue with company setup.',
  ssoContinueRegular: 'Continue with regular sign up',
  failureDetails: 'Details:',
  failureOnHost: (h) => `(on ${h})`,
  tryAgain: 'Try again',
  dismiss: 'Dismiss',
  menuSignedInAs: 'Signed in as',
  menuAuthentication: 'Authentication',
  loading: 'Loading....',
  authenticating: 'Authenticating...',
  authenticatingAria: 'Authenticating',
  pleaseSignIn: 'Please sign in',
  signOut: 'Sign-out',
};

/** No native review yet. Informal "tú". */
export const AUTH_UI_LABELS_ES: IAuthUiLabels = {
  lang: 'es',
  loginTitle: (app) => `Iniciar sesión en ${app}`,
  joinTeamPrompt: 'Inicia sesión para unirte a un equipo',
  signInWithSneatAccount: 'Inicia sesión con tu cuenta de Sneat.',
  signingYouIn: 'Iniciando sesión…',
  signedInAsLead: 'Has iniciado sesión como',
  alreadySignedIn: 'Ya has iniciado sesión',
  signedInWith: (p) => `Sesión iniciada con ${p}`,
  providerPassword: 'correo y contraseña',
  providerPhone: 'teléfono',
  continueTo: (app) => `Continuar a ${app}`,
  useAnotherAccount: 'Usar otra cuenta',
  helpLead: '¿Algún problema? Escríbenos a',
  authRecovery:
    'No pudimos completar el inicio de sesión. Inténtalo de nuevo con el correo u otro método.',
  pendingLinkHasAccount: (e) => `${e} ya tiene una cuenta.`,
  pendingLinkNoEmail: 'Este correo ya tiene una cuenta.',
  pendingLinkNext: ({ provider, autoLink }) =>
    'Inicia sesión como lo hiciste antes —con el correo u otro método— ' +
    (autoLink
      ? `y conectaremos ${provider} automáticamente.`
      : `y después conecta ${provider} desde la página de tu cuenta.`),
  accountSetupFailed:
    'Tu cuenta aún se está preparando. Reintenta antes de continuar.',
  retryAccountSetup: 'Reintentar la configuración',
  preparingAccount: 'Preparando tu cuenta…',
  signInWithCompanySso: 'Iniciar sesión con el SSO de tu empresa',
  quickLogin: 'Acceso rápido',
  loginWith: (p) => `Continuar con ${p}`,
  signUp: 'Registrarse',
  signIn: 'Iniciar sesión',
  email: 'Correo electrónico',
  firstName: 'Nombre',
  lastName: 'Apellidos',
  companyName: 'Nombre de la empresa',
  required: 'obligatorio',
  existingAccountHint:
    'Este correo ya tiene una cuenta. Introduce tu contraseña para iniciar sesión o recibe un enlace de acceso por correo.',
  password: 'Contraseña',
  resetPasswordTitle:
    'Enviar un correo con un enlace para restablecer la contraseña',
  forgotReset: '¿La olvidaste?',
  wrongPassword: 'Contraseña incorrecta',
  signingUp: 'Creando la cuenta…',
  signingIn: 'Iniciando sesión…',
  withPasswordSuffix: 'con contraseña',
  or: 'o',
  getSignInLink: 'Enviar enlace de acceso',
  emailRequired: 'El correo electrónico es obligatorio',
  firstNameRequired: 'El nombre es obligatorio',
  lastNameRequired: 'Los apellidos son obligatorios',
  companyRequired: 'El nombre de la empresa es obligatorio',
  signInLinkSent: (email) => `Hemos enviado un enlace de acceso a ${email}`,
  passwordResetSent:
    'Si existe una cuenta con este correo, te enviaremos instrucciones para restablecer la contraseña.',
  emailLinkTitle: 'Acceso con enlace por correo',
  emailLinkRetype:
    '¡Te damos la bienvenida! Por tu seguridad, vuelve a escribir tu correo electrónico para iniciar sesión.',
  telegramLogIn: 'Iniciar sesión con Telegram',
  telegramUnreachable:
    'El acceso con Telegram no está disponible: no pudimos conectar con el servidor de inicio de sesión (problema de red o de configuración del sitio). Usa otro método o inténtalo más tarde.',
  ssoTitle: 'SSO de empresa',
  ssoUseCompanyEmailLead: 'Usa el correo de tu empresa que termina en',
  ssoEnterWorkEmail:
    'Introduce tu correo de trabajo para encontrar el proveedor de identidad de tu organización.',
  ssoWorkEmail: 'Correo de trabajo',
  ssoContinue: 'Continuar con SSO',
  ssoNotConfigured: (d) => `El SSO aún no está configurado para ${d}.`,
  ssoRegularReturn:
    'Inicia sesión o crea tu cuenta normal de Sneat y te devolveremos adonde empezaste.',
  ssoRegularSetup:
    'Inicia sesión o crea tu cuenta normal de Sneat y seguiremos con la configuración de la empresa.',
  ssoContinueRegular: 'Continuar con el registro normal',
  failureDetails: 'Detalles:',
  failureOnHost: (h) => `(en ${h})`,
  tryAgain: 'Reintentar',
  dismiss: 'Cerrar',
  menuSignedInAs: 'Sesión iniciada como',
  menuAuthentication: 'Autenticación',
  loading: 'Cargando…',
  authenticating: 'Autenticando…',
  authenticatingAria: 'Autenticando',
  pleaseSignIn: 'Inicia sesión',
  signOut: 'Cerrar sesión',
};

/** No native review yet. Informal "du", as in the meeting library. */
export const AUTH_UI_LABELS_DE: IAuthUiLabels = {
  lang: 'de',
  loginTitle: (app) => `Anmelden bei ${app}`,
  joinTeamPrompt: 'Melde dich an, um einem Team beizutreten',
  signInWithSneatAccount: 'Melde dich mit deinem Sneat-Konto an.',
  signingYouIn: 'Du wirst angemeldet…',
  signedInAsLead: 'Du bist angemeldet als',
  alreadySignedIn: 'Du bist bereits angemeldet',
  signedInWith: (p) => `Angemeldet über ${p}`,
  providerPassword: 'E-Mail und Passwort',
  providerPhone: 'Telefon',
  continueTo: (app) => `Weiter zu ${app}`,
  useAnotherAccount: 'Anderes Konto verwenden',
  helpLead: 'Probleme? Schreib uns an',
  authRecovery:
    'Die Anmeldung konnte nicht abgeschlossen werden. Versuch es erneut per E-Mail oder mit einer anderen Methode.',
  pendingLinkHasAccount: (e) => `Für ${e} gibt es bereits ein Konto.`,
  pendingLinkNoEmail: 'Für diese E-Mail gibt es bereits ein Konto.',
  pendingLinkNext: ({ provider, autoLink }) =>
    'Melde dich so an wie beim letzten Mal – per E-Mail oder mit einer anderen Methode – ' +
    (autoLink
      ? `und wir verknüpfen ${provider} automatisch damit.`
      : `und verknüpfe ${provider} danach auf deiner Kontoseite.`),
  accountSetupFailed:
    'Dein Konto wird noch eingerichtet. Versuch es erneut, bevor du fortfährst.',
  retryAccountSetup: 'Einrichtung wiederholen',
  preparingAccount: 'Dein Konto wird eingerichtet…',
  signInWithCompanySso: 'Mit Firmen-SSO anmelden',
  quickLogin: 'Schnellanmeldung',
  loginWith: (p) => `Mit ${p} anmelden`,
  signUp: 'Registrieren',
  signIn: 'Anmelden',
  email: 'E-Mail',
  firstName: 'Vorname',
  lastName: 'Nachname',
  companyName: 'Firmenname',
  required: 'Pflichtfeld',
  existingAccountHint:
    'Für diese E-Mail gibt es bereits ein Konto. Gib dein Passwort ein oder lass dir einen Anmeldelink per E-Mail schicken.',
  password: 'Passwort',
  resetPasswordTitle:
    'E-Mail mit einem Link zum Zurücksetzen des Passworts senden',
  forgotReset: 'Vergessen?',
  wrongPassword: 'Falsches Passwort',
  signingUp: 'Registrierung läuft…',
  signingIn: 'Anmeldung läuft…',
  withPasswordSuffix: 'mit Passwort',
  or: 'oder',
  getSignInLink: 'Anmeldelink anfordern',
  emailRequired: 'Bitte gib deine E-Mail-Adresse ein',
  firstNameRequired: 'Bitte gib deinen Vornamen ein',
  lastNameRequired: 'Bitte gib deinen Nachnamen ein',
  companyRequired: 'Bitte gib den Firmennamen ein',
  signInLinkSent: (email) => `Der Anmeldelink wurde an ${email} gesendet`,
  passwordResetSent:
    'Falls es ein Konto mit dieser E-Mail gibt, schicken wir dir eine Anleitung zum Zurücksetzen des Passworts.',
  emailLinkTitle: 'Anmeldung per E-Mail-Link',
  emailLinkRetype:
    'Willkommen! Gib zu deiner Sicherheit deine E-Mail-Adresse noch einmal ein, um dich anzumelden.',
  telegramLogIn: 'Mit Telegram anmelden',
  telegramUnreachable:
    'Die Telegram-Anmeldung ist nicht verfügbar: Der Anmeldeserver ist nicht erreichbar (Netzwerk- oder Konfigurationsproblem). Nutze eine andere Methode oder versuch es später noch einmal.',
  ssoTitle: 'Firmen-SSO',
  ssoUseCompanyEmailLead: 'Verwende deine Firmen-E-Mail mit der Endung',
  ssoEnterWorkEmail:
    'Gib deine geschäftliche E-Mail ein, um den Identitätsanbieter deiner Organisation zu finden.',
  ssoWorkEmail: 'Geschäftliche E-Mail',
  ssoContinue: 'Weiter mit SSO',
  ssoNotConfigured: (d) => `Für ${d} ist SSO noch nicht eingerichtet.`,
  ssoRegularReturn:
    'Melde dich an oder erstelle ein normales Sneat-Konto – danach bringen wir dich dorthin zurück, wo du angefangen hast.',
  ssoRegularSetup:
    'Melde dich an oder erstelle ein normales Sneat-Konto – danach geht es mit der Firmeneinrichtung weiter.',
  ssoContinueRegular: 'Weiter mit normaler Registrierung',
  failureDetails: 'Details:',
  failureOnHost: (h) => `(auf ${h})`,
  tryAgain: 'Erneut versuchen',
  dismiss: 'Schließen',
  menuSignedInAs: 'Angemeldet als',
  menuAuthentication: 'Anmeldung',
  loading: 'Wird geladen…',
  authenticating: 'Anmeldung läuft…',
  authenticatingAria: 'Anmeldung läuft',
  pleaseSignIn: 'Bitte anmelden',
  signOut: 'Abmelden',
};

/** No native review yet. Formal "vous", as French apps usually are. */
export const AUTH_UI_LABELS_FR: IAuthUiLabels = {
  lang: 'fr',
  loginTitle: (app) => `Connexion à ${app}`,
  joinTeamPrompt: 'Connectez-vous pour rejoindre une équipe',
  signInWithSneatAccount: 'Connectez-vous avec votre compte Sneat.',
  signingYouIn: 'Connexion en cours…',
  signedInAsLead: 'Vous êtes connecté en tant que',
  alreadySignedIn: 'Vous êtes déjà connecté',
  signedInWith: (p) => `Connecté avec ${p}`,
  providerPassword: 'e-mail et mot de passe',
  providerPhone: 'téléphone',
  continueTo: (app) => `Continuer vers ${app}`,
  useAnotherAccount: 'Utiliser un autre compte',
  helpLead: 'Un problème ? Écrivez-nous à',
  authRecovery:
    'Nous n’avons pas pu finaliser la connexion. Réessayez par e-mail ou avec une autre méthode.',
  pendingLinkHasAccount: (e) => `${e} a déjà un compte.`,
  pendingLinkNoEmail: 'Cet e-mail a déjà un compte.',
  pendingLinkNext: ({ provider, autoLink }) =>
    'Connectez-vous comme la dernière fois — par e-mail ou avec une autre méthode — ' +
    (autoLink
      ? `et nous y associerons ${provider} automatiquement.`
      : `puis associez ${provider} depuis la page de votre compte.`),
  accountSetupFailed:
    'Votre compte est encore en préparation. Réessayez avant de continuer.',
  retryAccountSetup: 'Relancer la configuration',
  preparingAccount: 'Préparation de votre compte…',
  signInWithCompanySso: 'Se connecter avec le SSO de l’entreprise',
  quickLogin: 'Connexion rapide',
  loginWith: (p) => `Continuer avec ${p}`,
  signUp: 'S’inscrire',
  signIn: 'Se connecter',
  email: 'E-mail',
  firstName: 'Prénom',
  lastName: 'Nom',
  companyName: 'Nom de l’entreprise',
  required: 'obligatoire',
  existingAccountHint:
    'Cet e-mail a déjà un compte. Saisissez votre mot de passe pour vous connecter, ou recevez un lien de connexion par e-mail.',
  password: 'Mot de passe',
  resetPasswordTitle:
    'Envoyer un e-mail avec un lien pour réinitialiser le mot de passe',
  forgotReset: 'Oublié ?',
  wrongPassword: 'Mot de passe incorrect',
  signingUp: 'Inscription…',
  signingIn: 'Connexion…',
  withPasswordSuffix: 'avec mot de passe',
  or: 'ou',
  getSignInLink: 'Recevoir un lien',
  emailRequired: 'L’e-mail est obligatoire',
  firstNameRequired: 'Le prénom est obligatoire',
  lastNameRequired: 'Le nom est obligatoire',
  companyRequired: 'Le nom de l’entreprise est obligatoire',
  signInLinkSent: (email) => `Un lien de connexion a été envoyé à ${email}`,
  passwordResetSent:
    'Si un compte existe pour cet e-mail, vous recevrez les instructions de réinitialisation du mot de passe.',
  emailLinkTitle: 'Connexion par lien e-mail',
  emailLinkRetype:
    'Bienvenue ! Pour votre sécurité, saisissez à nouveau votre adresse e-mail pour vous connecter.',
  telegramLogIn: 'Se connecter avec Telegram',
  telegramUnreachable:
    'La connexion Telegram est indisponible : impossible de joindre le serveur de connexion (problème de réseau ou de configuration du site). Utilisez une autre méthode ou réessayez plus tard.',
  ssoTitle: 'SSO d’entreprise',
  ssoUseCompanyEmailLead:
    'Utilisez votre e-mail professionnel se terminant par',
  ssoEnterWorkEmail:
    'Saisissez votre e-mail professionnel pour trouver le fournisseur d’identité de votre organisation.',
  ssoWorkEmail: 'E-mail professionnel',
  ssoContinue: 'Continuer avec le SSO',
  ssoNotConfigured: (d) => `Le SSO n’est pas encore configuré pour ${d}.`,
  ssoRegularReturn:
    'Connectez-vous ou créez un compte Sneat classique, puis nous vous ramènerons là où vous avez commencé.',
  ssoRegularSetup:
    'Connectez-vous ou créez un compte Sneat classique, puis nous poursuivrons la configuration de l’entreprise.',
  ssoContinueRegular: 'Continuer avec l’inscription classique',
  failureDetails: 'Détails :',
  failureOnHost: (h) => `(sur ${h})`,
  tryAgain: 'Réessayer',
  dismiss: 'Fermer',
  menuSignedInAs: 'Connecté en tant que',
  menuAuthentication: 'Authentification',
  loading: 'Chargement…',
  authenticating: 'Authentification…',
  authenticatingAria: 'Authentification',
  pleaseSignIn: 'Connectez-vous',
  signOut: 'Se déconnecter',
};

/** No native review yet. "Você". */
export const AUTH_UI_LABELS_PT_BR: IAuthUiLabels = {
  lang: 'pt-BR',
  loginTitle: (app) => `Entrar em ${app}`,
  joinTeamPrompt: 'Entre para participar de uma equipe',
  signInWithSneatAccount: 'Entre com sua conta Sneat.',
  signingYouIn: 'Entrando…',
  signedInAsLead: 'Você entrou como',
  alreadySignedIn: 'Você já está conectado',
  signedInWith: (p) => `Conectado com ${p}`,
  providerPassword: 'e-mail e senha',
  providerPhone: 'telefone',
  continueTo: (app) => `Continuar para ${app}`,
  useAnotherAccount: 'Usar outra conta',
  helpLead: 'Algum problema? Escreva para',
  authRecovery:
    'Não foi possível concluir o login. Tente de novo com e-mail ou outro método.',
  pendingLinkHasAccount: (e) => `${e} já tem uma conta.`,
  pendingLinkNoEmail: 'Este e-mail já tem uma conta.',
  pendingLinkNext: ({ provider, autoLink }) =>
    'Entre do mesmo jeito que da última vez — com e-mail ou outro método — ' +
    (autoLink
      ? `e vamos conectar o ${provider} a ela automaticamente.`
      : `e depois conecte o ${provider} na página da sua conta.`),
  accountSetupFailed:
    'Sua conta ainda está sendo preparada. Tente de novo antes de continuar.',
  retryAccountSetup: 'Configurar a conta de novo',
  preparingAccount: 'Preparando sua conta…',
  signInWithCompanySso: 'Entrar com o SSO da empresa',
  quickLogin: 'Login rápido',
  loginWith: (p) => `Entrar com ${p}`,
  signUp: 'Criar conta',
  signIn: 'Entrar',
  email: 'E-mail',
  firstName: 'Nome',
  lastName: 'Sobrenome',
  companyName: 'Nome da empresa',
  required: 'obrigatório',
  existingAccountHint:
    'Este e-mail já tem uma conta. Digite sua senha para entrar ou receba um link de acesso por e-mail.',
  password: 'Senha',
  resetPasswordTitle: 'Enviar e-mail com um link para redefinir a senha',
  forgotReset: 'Esqueceu?',
  wrongPassword: 'Senha incorreta',
  signingUp: 'Criando conta…',
  signingIn: 'Entrando…',
  withPasswordSuffix: 'com senha',
  or: 'ou',
  getSignInLink: 'Receber link de acesso',
  emailRequired: 'O e-mail é obrigatório',
  firstNameRequired: 'O nome é obrigatório',
  lastNameRequired: 'O sobrenome é obrigatório',
  companyRequired: 'O nome da empresa é obrigatório',
  signInLinkSent: (email) => `Enviamos um link de acesso para ${email}`,
  passwordResetSent:
    'Se existir uma conta com este e-mail, enviaremos as instruções para redefinir a senha.',
  emailLinkTitle: 'Entrando com link por e-mail',
  emailLinkRetype:
    'Boas-vindas! Para sua segurança, digite seu e-mail de novo para entrar.',
  telegramLogIn: 'Entrar com o Telegram',
  telegramUnreachable:
    'O login com Telegram não está disponível: não conseguimos acessar o servidor de login (problema de rede ou de configuração do site). Use outro método ou tente mais tarde.',
  ssoTitle: 'SSO da empresa',
  ssoUseCompanyEmailLead: 'Use o e-mail da sua empresa que termina em',
  ssoEnterWorkEmail:
    'Digite seu e-mail de trabalho para encontrar o provedor de identidade da sua organização.',
  ssoWorkEmail: 'E-mail de trabalho',
  ssoContinue: 'Continuar com SSO',
  ssoNotConfigured: (d) => `O SSO ainda não está configurado para ${d}.`,
  ssoRegularReturn:
    'Entre ou crie sua conta Sneat comum, e levaremos você de volta para onde começou.',
  ssoRegularSetup:
    'Entre ou crie sua conta Sneat comum, e continuaremos com a configuração da empresa.',
  ssoContinueRegular: 'Continuar com o cadastro comum',
  failureDetails: 'Detalhes:',
  failureOnHost: (h) => `(em ${h})`,
  tryAgain: 'Tentar de novo',
  dismiss: 'Fechar',
  menuSignedInAs: 'Conectado como',
  menuAuthentication: 'Autenticação',
  loading: 'Carregando…',
  authenticating: 'Autenticando…',
  authenticatingAria: 'Autenticando',
  pleaseSignIn: 'Entre na sua conta',
  signOut: 'Sair',
};

/** Careful pass (the owner reads Russian). Formal "вы", lower case as in UI. */
export const AUTH_UI_LABELS_RU: IAuthUiLabels = {
  lang: 'ru',
  loginTitle: (app) => `Вход в ${app}`,
  joinTeamPrompt: 'Войдите, чтобы присоединиться к команде',
  signInWithSneatAccount: 'Войдите с помощью аккаунта Sneat.',
  signingYouIn: 'Выполняем вход…',
  signedInAsLead: 'Вы вошли как',
  alreadySignedIn: 'Вы уже вошли',
  signedInWith: (p) => `Вы вошли через ${p}`,
  providerPassword: 'эл. почту и пароль',
  providerPhone: 'телефон',
  continueTo: (app) => `Перейти в ${app}`,
  useAnotherAccount: 'Войти в другой аккаунт',
  helpLead: 'Если что-то не работает, пишите на',
  authRecovery:
    'Не удалось завершить вход. Попробуйте ещё раз через почту или другим способом.',
  pendingLinkHasAccount: (e) => `Для ${e} уже есть аккаунт.`,
  pendingLinkNoEmail: 'Для этой почты уже есть аккаунт.',
  pendingLinkNext: ({ provider, autoLink }) =>
    'Войдите так же, как в прошлый раз, — через почту или другим способом, — ' +
    (autoLink
      ? `и мы автоматически привяжем к нему ${provider}.`
      : `а затем привяжите ${provider} на странице аккаунта.`),
  accountSetupFailed:
    'Аккаунт ещё готовится. Повторите попытку, прежде чем продолжить.',
  retryAccountSetup: 'Повторить настройку',
  preparingAccount: 'Готовим ваш аккаунт…',
  signInWithCompanySso: 'Войти через корпоративный SSO',
  quickLogin: 'Быстрый вход',
  loginWith: (p) => `Войти через ${p}`,
  signUp: 'Регистрация',
  signIn: 'Войти',
  email: 'Эл. почта',
  firstName: 'Имя',
  lastName: 'Фамилия',
  companyName: 'Название компании',
  required: 'обязательно',
  existingAccountHint:
    'Для этой почты уже есть аккаунт. Введите пароль или получите ссылку для входа на почту.',
  password: 'Пароль',
  resetPasswordTitle: 'Отправить письмо со ссылкой для сброса пароля',
  forgotReset: 'Забыли?',
  wrongPassword: 'Неверный пароль',
  signingUp: 'Регистрируем…',
  signingIn: 'Входим…',
  withPasswordSuffix: 'по паролю',
  or: 'или',
  getSignInLink: 'Войти по ссылке',
  emailRequired: 'Укажите адрес эл. почты',
  firstNameRequired: 'Укажите имя',
  lastNameRequired: 'Укажите фамилию',
  companyRequired: 'Укажите название компании',
  signInLinkSent: (email) => `Ссылка для входа отправлена на ${email}`,
  passwordResetSent:
    'Если аккаунт с этой почтой существует, мы отправим на неё инструкции по сбросу пароля.',
  emailLinkTitle: 'Вход по ссылке из письма',
  emailLinkRetype:
    'Добро пожаловать! В целях безопасности введите адрес эл. почты ещё раз, чтобы войти.',
  telegramLogIn: 'Войти через Telegram',
  telegramUnreachable:
    'Вход через Telegram недоступен: не удалось связаться с сервером входа (проблема с сетью или настройками сайта). Выберите другой способ или попробуйте позже.',
  ssoTitle: 'Корпоративный SSO',
  ssoUseCompanyEmailLead: 'Укажите рабочую почту с окончанием',
  ssoEnterWorkEmail:
    'Введите рабочую почту, чтобы найти поставщика удостоверений вашей организации.',
  ssoWorkEmail: 'Рабочая почта',
  ssoContinue: 'Продолжить через SSO',
  ssoNotConfigured: (d) => `Для ${d} SSO пока не настроен.`,
  ssoRegularReturn:
    'Войдите или создайте обычный аккаунт Sneat — после этого мы вернём вас туда, откуда вы начали.',
  ssoRegularSetup:
    'Войдите или создайте обычный аккаунт Sneat — после этого продолжим настройку компании.',
  ssoContinueRegular: 'Продолжить с обычной регистрацией',
  failureDetails: 'Подробности:',
  failureOnHost: (h) => `(на ${h})`,
  tryAgain: 'Попробовать снова',
  dismiss: 'Закрыть',
  menuSignedInAs: 'Вы вошли как',
  menuAuthentication: 'Вход',
  loading: 'Загрузка…',
  authenticating: 'Выполняем вход…',
  authenticatingAria: 'Выполняем вход',
  pleaseSignIn: 'Войдите в аккаунт',
  signOut: 'Выйти',
};

export const AUTH_UI_LABEL_SETS: Readonly<Record<SneatLang, IAuthUiLabels>> = {
  en: AUTH_UI_LABELS_EN,
  es: AUTH_UI_LABELS_ES,
  de: AUTH_UI_LABELS_DE,
  fr: AUTH_UI_LABELS_FR,
  'pt-BR': AUTH_UI_LABELS_PT_BR,
  ru: AUTH_UI_LABELS_RU,
};

/**
 * The current label set, following `SneatLanguageService.lang()` (English
 * until the app opts in with `provideSneatLanguage()`). An app can override
 * it, e.g. with a fixed set in tests.
 */
export const AUTH_UI_LABELS = new InjectionToken<Signal<IAuthUiLabels>>(
  'AUTH_UI_LABELS',
  {
    providedIn: 'root',
    factory: () => {
      const lang = inject(SneatLanguageService).lang;
      return computed(() => AUTH_UI_LABEL_SETS[lang()]);
    },
  },
);
