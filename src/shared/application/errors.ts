export class RecursoNaoEncontradoError extends Error {
  constructor(recurso: string, identificador?: string) {
    super(
      identificador
        ? `${recurso} não encontrado(a): ${identificador}`
        : `${recurso} não encontrado(a)`,
    );
    this.name = 'RecursoNaoEncontradoError';
  }
}

export class ConflitoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflitoError';
  }
}

export class CredenciaisInvalidasError extends Error {
  constructor(message = 'Credenciais inválidas') {
    super(message);
    this.name = 'CredenciaisInvalidasError';
  }
}
