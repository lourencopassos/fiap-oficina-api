import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { HasherSenha } from '../application/portas';

@Injectable()
export class BcryptHasherSenha extends HasherSenha {
  private static readonly CUSTO = 10;

  gerar(senha: string): Promise<string> {
    return bcrypt.hash(senha, BcryptHasherSenha.CUSTO);
  }

  comparar(senha: string, hash: string): Promise<boolean> {
    return bcrypt.compare(senha, hash);
  }
}
