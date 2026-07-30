export class FirebaseTokenVerificationError extends Error {
  constructor() {
    super('Firebase ID Token verification failed.');
    this.name = FirebaseTokenVerificationError.name;
  }
}

export class FirebaseIdentityLookupError extends Error {
  constructor() {
    super('Firebase user lookup failed.');
    this.name = FirebaseIdentityLookupError.name;
  }
}
