# Pruebas automatizadas para agentes

## Comando único

Desde la raíz del repositorio:

```bash
composer test:agent
```

El comando usa SQLite en memoria, no modifica la base local ni requiere datos
sembrados. También compila el frontend de producción.

## Criterio objetivo

- **APROBADO:** el comando termina con código `0`, todas las pruebas indican
  `passed` y `npm run build` termina con `built`.
- **RECHAZADO:** el comando termina con un código distinto de `0`, aparece al
  menos un `FAILED`/`ERROR` o falla la compilación.

El warning de Vite sobre el tamaño de un chunk es informativo y no constituye
un fallo mientras la compilación finalice correctamente.

## Cobertura de la batería

| Área | Comportamientos verificados |
| --- | --- |
| Autenticación | Acceso por nombre y contraseña, credenciales inválidas, redirección según rol y protección de rutas para invitados. |
| Autorización | Capacidades de Administrador, Cajero y Taller sobre usuarios, catálogos, órdenes, movimientos, métricas y resumen diario. |
| Usuarios | Alta, edición sin cambio accidental de contraseña, cambio de rol, baja, duplicados y validaciones. |
| Clientes y vehículos | Alta de cliente, alta y asociación de vehículo, patente, APIs relacionadas, desasociación y protección cuando existen órdenes. |
| Catálogo vehicular | Alta de marca/modelo, normalización de espacios, duplicados y bloqueo de borrado de modelos en uso. |
| Órdenes | Alta completa, correlativos independientes OT/FC, fechas, total mayor a cero, atributos obligatorios y pago requerido para finalizar. |
| Operación de órdenes | Asignado/completado por, anulación con motivo e historial, pausa/reanudación, estados finales, permisos y modo solo lectura. |
| Caja | Pagos y movimientos en ARS/USD, conversión, validaciones, ajustes, reversas y totales separados por moneda. |
| Migraciones | Actualización idempotente de estados sin perder referencias de órdenes ni historial. |
| Frontend | Compilación de producción con Vite. |

## Cómo informar el resultado

El agente debe devolver:

1. comando ejecutado;
2. código de salida;
3. cantidad de pruebas y aserciones;
4. resultado de la compilación;
5. para cualquier fallo: archivo, nombre del caso y primer mensaje de error.

No debe considerar aprobada la validación con pruebas omitidas, con un filtro
parcial o después de cambiar el código durante la misma ejecución.

## Ejecución por área

Para aislar un fallo sin reemplazar la ejecución completa:

```bash
php artisan test --compact tests/Agent
php artisan test --compact tests/Feature/PausaOrdenDeTrabajoTest.php
php artisan test --compact tests/Feature/PagoEnDolaresTest.php tests/Feature/MovimientoDolaresTest.php
php artisan test --compact tests/Feature/AnulacionOrdenMotivoTest.php tests/Feature/ResponsablesOrdenTest.php
```
