# proyecto-cristales
## Repositorio donde desarrollaremos el proyecto correspondiente al taller de colocación de cristales para autos
#### Link al Trello:
- _https://trello.com/invite/b/68c0a348a07e02268a20a7de/ATTI847ba9b09c87c6c19de087c59f3c531bAAB3B4C8/proyecto-cristales_

## Instalación local (XAMPP)
1. composer install
2. cp .env.example .env
3. configurar DB MySQL
4. php artisan key:generate
5. php artisan migrate:fresh --seed
6. php artisan serve

## Validación automatizada para agentes

La batería reproducible y sus criterios de aceptación están documentados en
[`docs/PRUEBAS_PARA_AGENTES.md`](docs/PRUEBAS_PARA_AGENTES.md).

```bash
composer test:agent
```
