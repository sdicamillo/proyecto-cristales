<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('orden_de_trabajo', function (Blueprint $table) {
            $table->string('numero_factura', 50)->nullable()->after('con_factura');
        });
    }

    public function down(): void
    {
        Schema::table('orden_de_trabajo', function (Blueprint $table) {
            $table->dropColumn('numero_factura');
        });
    }
};
