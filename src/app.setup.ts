import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { HttpExceptionFilter } from './shared/infrastructure/http/http-exception.filter';

/** Configuração HTTP compartilhada entre a aplicação e os testes de integração. */
export function configurarApp(app: INestApplication): INestApplication {
  // CSP sem upgrade-insecure-requests: o MVP roda em HTTP local (TLS fica a cargo do proxy/ingress).
  app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } } }));
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Oficina Mecânica - API')
    .setDescription(
      'MVP do Sistema Integrado de Atendimento e Execução de Serviços.\n\n' +
        '**Autenticação:** faça login em `POST /auth/login`, copie o `accessToken` e clique em *Authorize*. ' +
        'Rotas `/admin/*` exigem JWT; rotas `/public/*` são do cliente (código da OS + CPF/CNPJ).',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config), {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: { persistAuthorization: true },
  });
  return app;
}
