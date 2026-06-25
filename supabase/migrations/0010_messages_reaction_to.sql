-- Armazena o Evolution message_id da mensagem que recebeu a reação.
-- Permite agrupar reações na bolha correta no frontend.
alter table messages add column if not exists reaction_to text;
