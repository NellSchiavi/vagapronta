-- Apaga os dois usuários de exemplo e TODOS os dados ligados a eles
-- (perfis, currículos, análises, vagas, cartas, candidaturas e uso da IA).
-- Não mexe em nenhum outro usuário.
--
-- Como rodar no ambiente local:
--   Studio (http://127.0.0.1:54323) → SQL Editor → cole este arquivo → Run
delete from auth.users
where id in ('5eed0000-0000-4000-8000-00000000000a', '5eed0000-0000-4000-8000-00000000000b');
