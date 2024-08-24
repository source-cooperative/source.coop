export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super("You are not authorized to perform this action");
    this.name = "UnauthorizedError";
  }
}

export class MethodNotImplementedError extends Error {
  constructor() {
    super("Method not implemented");
    this.name = "MethodNotImplementedError";
  }
}
