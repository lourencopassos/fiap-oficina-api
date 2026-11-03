import { registerDecorator, ValidationOptions } from 'class-validator';
import { Documento } from '../../domain/value-objects/documento';
import { Placa } from '../../domain/value-objects/placa';

/** Valida CPF/CNPJ (dígitos verificadores) já na borda HTTP, reutilizando o Value Object. */
export function IsCpfOuCnpj(options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: 'isCpfOuCnpj',
      target: target.constructor,
      propertyName,
      options: { message: `${propertyName} deve ser um CPF ou CNPJ válido`, ...options },
      validator: {
        validate: (valor: unknown) => typeof valor === 'string' && Documento.ehValido(valor),
      },
    });
}

/** Valida placa no padrão antigo ou Mercosul, reutilizando o Value Object. */
export function IsPlaca(options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: 'isPlaca',
      target: target.constructor,
      propertyName,
      options: {
        message: `${propertyName} deve ser uma placa válida (ABC1234 ou ABC1D23)`,
        ...options,
      },
      validator: {
        validate: (valor: unknown) => typeof valor === 'string' && Placa.ehValida(valor),
      },
    });
}
