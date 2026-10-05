<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Estado extends Model
{
    protected $table = 'estado';

    protected $fillable = ['nombre'];

    public const NOMBRE_ANULADA = 'Anulada';

    public const NOMBRE_PAUSADA = 'Pausada';

    public const NOMBRE_INICIADO = 'Iniciado';

    public const NOMBRE_EN_TALLER = 'En taller';

    public const NOMBRE_RETIRADA = 'Retirada';

    public const NOMBRE_FINALIZADA = 'Finalizada - Para Retirar';

    public const ESTADOS_FINALES = [
        self::NOMBRE_FINALIZADA,
        self::NOMBRE_RETIRADA,
        self::NOMBRE_ANULADA,
    ];

    public const ESTADOS_TALLER = [
        self::NOMBRE_INICIADO,
        self::NOMBRE_EN_TALLER,
        self::NOMBRE_PAUSADA,
    ];

    public const ESTADOS_CAMBIO_TALLER = [
        self::NOMBRE_INICIADO,
        self::NOMBRE_EN_TALLER,
    ];

    public function ordenesDeTrabajo()
    {
        return $this->hasMany(OrdenDeTrabajo::class, 'estado_id');
    }

    public static function idsParaTaller(): array
    {
        return self::query()
            ->whereIn('nombre', self::ESTADOS_TALLER)
            ->pluck('id')
            ->all();
    }

    public static function idsPermitidosCambioTaller(): array
    {
        return self::query()
            ->whereIn('nombre', self::ESTADOS_CAMBIO_TALLER)
            ->pluck('id')
            ->all();
    }

    public static function idAnulada(): ?int
    {
        return self::query()
            ->where('nombre', self::NOMBRE_ANULADA)
            ->value('id');
    }

    public static function idPausada(): ?int
    {
        return self::query()
            ->where('nombre', self::NOMBRE_PAUSADA)
            ->value('id');
    }

    public static function esFinal(?string $nombre): bool
    {
        return in_array($nombre, self::ESTADOS_FINALES, true);
    }
}
