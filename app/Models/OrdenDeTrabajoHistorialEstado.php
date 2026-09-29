<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrdenDeTrabajoHistorialEstado extends Model
    {
        protected $table = 'orden_de_trabajo_historial_estados';

        public $timestamps = false;

        protected $fillable = [
            'orden_de_trabajo_id',
            'estado_id',
            'user_id',
            'motivo',
        ];

        public function estado()
        {
            return $this->belongsTo(Estado::class);
        }

        public function user()
        {
            return $this->belongsTo(User::class);
        }

        public function orden()
        {
            return $this->belongsTo(OrdenDeTrabajo::class, 'orden_de_trabajo_id');
        }
    }
