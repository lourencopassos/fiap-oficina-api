import { Email } from './email';

describe('Email', () => {
  it('normaliza para minúsculas sem espaços', () => {
    expect(Email.criar('  Joao@Email.COM ').valor).toBe('joao@email.com');
  });

  it.each(['joao', 'joao@', '@email.com', 'jo ao@email.com', ''])('rejeita %s', (e) => {
    expect(() => Email.criar(e)).toThrow('E-mail inválido');
  });

  it('rejeita nulo sem estourar', () => {
    expect(() => Email.criar(undefined as unknown as string)).toThrow('E-mail inválido');
  });
});
