<?php

namespace App\Support;

use App\Models\MedioDePago;

/**
 * Pagos y movimientos en efectivo en dólares: se guarda el monto en USD, el
 * tipo de cambio usado y el equivalente en pesos (que es el que suma en caja).
 */
class Dolares
{
    /** @return int[] */
    public static function idsMediosEnDolares(): array
    {
        return MedioDePago::where('moneda', MedioDePago::MONEDA_USD)->pluck('id')->map(fn ($id) => (int) $id)->all();
    }

    /**
     * Devuelve ['monto_usd', 'tipo_cambio', 'monto'] ya calculados. Si el medio
     * no es en dólares los datos en USD quedan en null y 'monto' no se toca.
     * Los errores se agregan a $errores con las claves "{$prefijo}monto_usd"
     * y "{$prefijo}tipo_cambio".
     */
    public static function normalizar(bool $enDolares, $montoUsd, $tipoCambio, $monto, string $prefijo, array &$errores): array
    {
        if (! $enDolares) {
            return ['monto_usd' => null, 'tipo_cambio' => null, 'monto' => $monto];
        }

        if ($montoUsd === null || $montoUsd === '') {
            $errores["{$prefijo}monto_usd"] = 'Ingresá el monto en dólares.';
        }
        if ($tipoCambio === null || $tipoCambio === '') {
            $errores["{$prefijo}tipo_cambio"] = 'Ingresá el tipo de cambio usado.';
        }
        if (isset($errores["{$prefijo}monto_usd"]) || isset($errores["{$prefijo}tipo_cambio"])) {
            return ['monto_usd' => null, 'tipo_cambio' => null, 'monto' => $monto];
        }

        $montoUsd = round((float) $montoUsd, 2);
        $tipoCambio = round((float) $tipoCambio, 2);

        return [
            'monto_usd' => $montoUsd,
            'tipo_cambio' => $tipoCambio,
            'monto' => round($montoUsd * $tipoCambio, 2),
        ];
    }
}
