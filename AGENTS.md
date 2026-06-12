# Diretrizes para Agentes de IA e Assistentes de Código

Este arquivo define as regras fundamentais de atuação para qualquer Inteligência Artificial (IA) interagindo com este repositório. O objetivo é manter o código limpo, funcional e alinhado com a filosofia "Get Shit Done".

Ao atuar neste projeto, você DEVE seguir estritamente as regras abaixo:

1. Reutilização em Primeiro Lugar (Don't Reinvent the Wheel)
 - Antes de criar qualquer nova função, componente, classe ou arquivo, analise a base de código existente.
 - Verifique se já existe uma solução, utilitário ou padrão implementado para o problema.
 - A prioridade número um é sempre a reutilização de código.

2. Pergunte, Não Adivinhe! (Zero Alucinação)
Se você identificar áreas cinzentas, requisitos mal explicados, falta de contexto ou ambiguidades na minha solicitação:
PARE E PERGUNTE!
 - Faça perguntas claras e diretas para esclarecer a dúvida.
 - Sob nenhuma hipótese tente adivinhar regras de negócio ou preencher lacunas com suposições.

3. Menos Código é Mais Resultado (KISS / YAGNI)
 - Foque em resolver o problema atual da forma mais simples e direta possível.
 - Entregue o resultado esperado escrevendo a menor quantidade de código viável.
 - Evite over-engineering (engenharia excessiva) e abstrações prematuras. Você não vai precisar disso (YAGNI - You Aren't Gonna Need It).

4. Modularização Sustentável
 - Escreva código modular e focado.
 - Funções e componentes devem ter uma única responsabilidade (Single Responsibility Principle).
 - Se um arquivo ou função estiver crescendo demais, divida-o de forma lógica para facilitar a manutenção e a leitura.

5. Passos Atômicos (Atomic Changes)
 - Faça uma alteração estrutural ou lógica de cada vez.
 - Não reescreva arquivos inteiros se a mudança for apenas em uma função ou trecho específico.
 - Mudanças pequenas, rápidas e iterativas permitem testar rápido (GSD) e evitam quebrar o que já está funcionando.

6. Testes como Contrato
 - O funcionamento da aplicação é inegociável.
 - Se alterar a lógica de um arquivo, atualize ou crie o teste correspondente na mesma iteração para garantir que a funcionalidade se mantém.
 - Não entregue código que quebre os testes existentes.

7. Tolerância Zero com any no TypeScript
 - Jamais utilize o tipo any em arquivos TypeScript.
 - Use sempre as melhores práticas de tipagem estática.
 - Se os tipos não existirem, crie as interfaces ou types necessários.
 - A tipagem deve ser estrita, previsível e ajudar na documentação do código.

8. Ao encontrar variaveis declaradas e não utilizadas, retire do código. 
  
### Clean Code (Código Limpo)

1. Nomenclatura Intencional (Meaningful Names)
 - O nome de uma variável, função ou classe deve responder a três grandes questões: por que existe, o que faz e como é usado.
 - Evite nomes genéricos (`data`, `info`, `manager`, `utils`) ou abreviações confusas.
 - Se você precisar de um comentário para explicar o que uma variável faz, o nome está errado.

2. Funções Minúsculas e de Propósito Único (Do One Thing)
 - Uma função deve fazer apenas UMA coisa, fazê-la bem e fazer apenas ela (Single Responsibility Principle para funções).
 - Mantenha o número de parâmetros o menor possível (idealmente 0 a 2). Se precisar de mais, encapsule-os em um objeto.
 - Separe comandos de consultas (Command Query Separation): uma função deve alterar o estado ou retornar informações, nunca os dois.

3.  O Código é a Documentação Principal
 - O código bem escrito é autoexplicativo. Evite comentários redundantes ou que explicam "o que" o código está fazendo.
 - Use comentários APENAS para explicar o "porquê" (decisões de design, regras de negócio complexas ou motivos para não seguir um padrão).
 - Nunca deixe código comentado (morto) no repositório. O Git serve para histórico.

4.  Tratamento de Erros Limpo (Clean Error Handling)
 - Prefira lançar Exceções (Exceptions) ao invés de retornar códigos de erro ou `null`.
 - Não passe `null` como argumento de funções e evite retornar `null` (use padrões como Null Object ou Optional se aplicável).
 - Isole os blocos de tratamento de erros da lógica principal. O tratamento de erros é "uma coisa" que a função faz (ver regra 9).

### Clean Architecture (Arquitetura Limpa)

1. A Regra de Dependência (The Dependency Rule)
 - As dependências do código-fonte devem apontar SEMPRE para dentro, em direção às regras de negócio de alto nível.
 - Camadas internas (Entidades, Casos de Uso) **não podem saber absolutamente nada** sobre camadas externas (UI, Banco de Dados, Frameworks Web, APIs externas).

2. Camadas de Responsabilidade Estrita
 - **Entidades (Entities):** Regras de negócio puras (agnósticas à aplicação).
 - **Casos de Uso (Use Cases):** Orquestram o fluxo de dados para a aplicação, usando as Entidades.
 - **Adaptadores (Interface Adapters):** Controllers, Presenters e Gateways (Repositories) que convertem dados do formato do Core para o formato da Web/Banco de Dados e vice-versa.
 - **Detalhes (Frameworks & Drivers):** Bibliotecas, rotas web, ORMs. Mantenha essa camada o mais fina possível.

3. Frameworks e Bancos de Dados são Detalhes
 - A sua arquitetura não deve depender da existência do React, Express, NestJS, Postgres ou MongoDB.
 - O "Core" da aplicação (Casos de Uso e Entidades) deve ser escrito em código puro e ser totalmente isolado de bibliotecas externas.
 - Trate o banco de dados e a interface de usuário como plug-ins que podem ser substituídos a qualquer momento sem afetar as regras de negócio.

4. Inversão de Dependência (DIP) e Testabilidade Absoluta
 - O Core da aplicação deve definir Interfaces (Portas), e as camadas externas (como Repositórios de Banco de Dados) devem implementar essas interfaces (Adaptadores).
 - Regras de negócio devem ser 100% testáveis de forma isolada, sem precisar subir um servidor web, conectar a um banco de dados real ou renderizar uma UI. Use mocks e stubs para injetar dependências nos testes.