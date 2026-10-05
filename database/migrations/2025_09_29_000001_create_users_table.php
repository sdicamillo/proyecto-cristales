<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite no permite eliminar una columna mientras conserva un índice que la referencia.
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['email']);
        });

        Schema::table('users', function (Blueprint $table) {
            // Elimina columnas que no querés
            $table->dropColumn(['email', 'email_verified_at', 'remember_token']);

            // Agrega role_id y relación con tabla rol
            $table->unsignedInteger('role_id')->after('password');
            $table->foreign('role_id')->references('role_id')->on('rol')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Revertir: quitar relación y columna
            $table->dropForeign(['role_id']);
            $table->dropColumn('role_id');

            // Volver a crear los campos eliminados
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
        });
    }
};
