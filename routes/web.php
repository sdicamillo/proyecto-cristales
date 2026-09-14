<?php

use App\Http\Controllers\Administrador\UserController;
use App\Http\Controllers\ArticuloController;
use App\Http\Controllers\CatalogoVehiculoController;
use App\Http\Controllers\ClienteController;
use App\Http\Controllers\CompaniaDeSeguroController;
use App\Http\Controllers\ConceptoController;
use App\Http\Controllers\DailySummaryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EgresoController;
use App\Http\Controllers\IngresoController;
use App\Http\Controllers\MarcaArticuloController;
use App\Http\Controllers\MedioDePagoController;
use App\Http\Controllers\MetricsController;
use App\Http\Controllers\OrdenDeTrabajoController;
use App\Support\Authorization\RoleCapabilities;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('admin', [DashboardController::class, 'index'])->name('dashboard');

    Route::middleware('capability:' . RoleCapabilities::MANAGE_USERS)->group(function () {
        Route::get('admin/users', [UserController::class, 'index'])->name('admin.users.index');
        Route::post('admin/users', [UserController::class, 'store'])->name('admin.users.store');
        Route::put('admin/users/{user}', [UserController::class, 'update'])->name('admin.users.update');
        Route::delete('admin/users/{user}', [UserController::class, 'destroy'])->name('admin.users.destroy');
    });

    Route::middleware('capability:' . RoleCapabilities::VIEW_FINANCIAL_METRICS)->group(function () {
        Route::get('admin/metrics', [MetricsController::class, 'index'])->name('admin.metrics.index');
    });

    Route::middleware('capability:' . RoleCapabilities::MANAGE_ADMIN_CATALOGS)->group(function () {
        Route::resource('catalogo-vehiculos', CatalogoVehiculoController::class)
            ->parameters(['catalogo-vehiculos' => 'modelo'])
            ->except(['create', 'show', 'edit']);

        Route::resource('clientes', ClienteController::class)
            ->parameters(['clientes' => 'cliente'])
            ->except(['create', 'show', 'edit']);
        Route::post('clientes/{cliente}/vehiculos/{vehiculo}', [ClienteController::class, 'attachVehicle'])
            ->name('clientes.attach-vehicle');
        Route::delete('clientes/{cliente}/vehiculos/{vehiculo}', [ClienteController::class, 'detachVehicle'])
            ->name('clientes.detach-vehicle');
        Route::get('api/clientes/{cliente}/vehiculos-disponibles', [ClienteController::class, 'getVehiculosDisponibles'])
            ->name('api.clientes.vehiculos-disponibles');
        Route::post('clientes/{cliente}/vehiculos', [ClienteController::class, 'createAndAttachVehicle'])
            ->name('clientes.create-vehicle');
        Route::get('api/clientes/modelos/{marcaId}', [ClienteController::class, 'getModelosByMarca'])
            ->name('api.clientes.modelos');
        Route::delete('vehiculos/{vehiculo}', [ClienteController::class, 'destroyVehicle'])
            ->name('vehiculos.destroy');

        Route::resource('conceptos', ConceptoController::class)
            ->only(['index', 'store', 'update', 'destroy']);

        Route::resource('articulos', ArticuloController::class)
            ->only(['index', 'store', 'update', 'destroy']);
        Route::get('articulos/{articulo}/categorias', [ArticuloController::class, 'getCategorias'])
            ->name('articulos.categorias');
        Route::post('articulos/{articulo}/categorias', [ArticuloController::class, 'storeCategoria'])
            ->name('articulos.categorias.store');
        Route::put('categorias/{categoria}', [ArticuloController::class, 'updateCategoria'])
            ->name('categorias.update');
        Route::delete('categorias/{categoria}', [ArticuloController::class, 'destroyCategoria'])
            ->name('categorias.destroy');
        Route::get('categorias/{categoria}/subcategorias', [ArticuloController::class, 'getSubcategorias'])
            ->name('categorias.subcategorias');
        Route::post('categorias/{categoria}/subcategorias', [ArticuloController::class, 'storeSubcategoria'])
            ->name('categorias.subcategorias.store');
        Route::put('subcategorias/{subcategoria}', [ArticuloController::class, 'updateSubcategoria'])
            ->name('subcategorias.update');
        Route::delete('subcategorias/{subcategoria}', [ArticuloController::class, 'destroySubcategoria'])
            ->name('subcategorias.destroy');

        Route::resource('medio-de-pago', MedioDePagoController::class)
            ->only(['index', 'store', 'update', 'destroy']);

        Route::get('/companias-seguros', [CompaniaDeSeguroController::class, 'index'])->name('companias-seguros.index');
        Route::post('/companias-seguros', [CompaniaDeSeguroController::class, 'store']);
        Route::put('/companias-seguros/{compania}', [CompaniaDeSeguroController::class, 'update']);
        Route::delete('/companias-seguros/{compania}', [CompaniaDeSeguroController::class, 'destroy']);

        Route::resource('marcas-articulos', MarcaArticuloController::class)
            ->except(['create', 'show', 'edit']);
    });

    Route::middleware('capability:' . RoleCapabilities::VIEW_FINANCIAL_MOVEMENTS)->group(function () {
        Route::resource('egresos', EgresoController::class);
        Route::put('/egresos/{id}', [EgresoController::class, 'update']);
        Route::post('/egresos/{id}', [EgresoController::class, 'update']);

        Route::resource('ingresos', IngresoController::class);
        Route::put('/ingresos/{id}', [IngresoController::class, 'update']);
        Route::post('/ingresos/{id}', [IngresoController::class, 'update']);
    });

    Route::resource('ordenes', OrdenDeTrabajoController::class)
        ->parameters([
            'ordenes' => 'orden',
        ]);

    Route::middleware(['rol.taller'])->group(function () {
        Route::get('/taller/ots', [OrdenDeTrabajoController::class, 'pendientes'])
            ->name('taller.ots');
        Route::get('/taller/ordenes/{orden}', [OrdenDeTrabajoController::class, 'show'])
            ->name('taller.ordenes.show');
        Route::patch('/taller/ordenes/{orden}/estado', [OrdenDeTrabajoController::class, 'cambiarEstadoTaller'])
            ->name('taller.ordenes.estado');
    });

    Route::get('api/marcas', [CatalogoVehiculoController::class, 'getMarcas'])->name('api.marcas');
    Route::get('api/marcas-articulos', [MarcaArticuloController::class, 'index'])->name('api.marcas-articulos.index');
    Route::post('api/marcas-articulos', [MarcaArticuloController::class, 'store'])->name('api.marcas-articulos.store');
    Route::get('api/modelos/{marcaId}', [CatalogoVehiculoController::class, 'getModelosByMarca'])->name('api.modelos');

    Route::middleware('capability:' . RoleCapabilities::VIEW_FINANCIAL_REPORTS)->group(function () {
        Route::get('/resumen-del-dia', [DailySummaryController::class, 'show'])->name('daily-summary.show');
        Route::get('/resumen-del-dia/imprimir', [DailySummaryController::class, 'print'])
            ->name('daily-summary.print');
    });
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
