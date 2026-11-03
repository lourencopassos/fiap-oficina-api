import { randomUUID } from 'node:crypto';

export abstract class Entity<P> {
  protected constructor(
    protected props: P,
    public readonly id: string = randomUUID(),
  ) {}

  equals(outra?: Entity<P>): boolean {
    return !!outra && outra.id === this.id;
  }
}
