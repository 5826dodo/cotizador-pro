<!-- Content Wrapper. Contains page content -->

<style>

    .table>tbody>tr>th {
        display: table-cell;
        vertical-align: middle;
    }

    #button {
      display: inline-block;
      background-color: #FF9800;
      width: 50px;
      height: 50px;
      text-align: center;
      border-radius: 4px;
      margin: 30px;
      position: fixed;
      bottom: 30px;
      right: 30px;
      transition: background-color .3s;
      z-index: 1000;
  }

  .show {
    z-index: 10;
}



#button:hover {
  cursor: pointer;
  background-color: #333;
}
#button:active {
  background-color: #555;
}

#button::after {
  content: "\f077";
  font-family: FontAwesome;
  font-weight: normal;
  font-style: normal;
  font-size: 2em;
  line-height: 50px;
  color: #fff;
}

.btn-danger {
    background-color: #dc3545; /* Color rojo */
    border-color: #dc3545; /* Color del borde */
}

.btn-danger:hover {
    background-color: #c82333; /* Color al pasar el mouse */
    border-color: #bd2130; /* Color del borde al pasar el mouse */
}



</style>
<style>
#flash-message {
    position: fixed; /* Fijo para que se mantenga en la pantalla */
    right: 0; /* Alinear a la derecha */
    top: 20px; /* Espacio desde la parte superior */
    width: 300px; /* Ancho específico del mensaje */
    max-width: 90%; /* Máximo ancho del 90% de la pantalla */
    z-index: 1050; /* Asegurarse de que esté por encima de otros elementos */
    margin: 0; /* Sin margen */
    padding: 15px; /* Espaciado interno */
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); /* Sombra para un efecto de elevación */
    display: none; /* Ocultarlo inicialmente */
}
</style>



<div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <section class="content-header">    
        <h1>
            Ticket #<?php echo $row->codigo; ?>
        </h1>
        <ol class="breadcrumb">
            <li>Tickets</li>
            <li class="active">Ticket #<?php echo $row->codigo; ?></li>
        </ol>
    </section>
   <?php if ($this->session->flashdata('info')): ?>
        <div class="alert alert-success" id="flash-message">
            <?php echo $this->session->flashdata('info'); ?>
        </div>
    <?php endif; ?>

    <!-- Main content -->
    <section class="content">

        <div class="row">
            <div class="col-md-5">

                <!-- Profile Image -->
                <div class="box box">
                    <div class="box-body box-profile">

                        <?php 

                        $originalDate = $row->f_asistencia;
                        $newDate = date("d-m-Y", strtotime($originalDate));

                        $originalDate1 = $row->fecha_solicitud;
                        $newDate1 = date("d-m-Y", strtotime($originalDate1)); 

                        $originalDate2 = $row->fecha_inicio_trabajo;
                        $newDate2 = date("d-m-Y", strtotime($originalDate2));

                        $originalDate3 = $row->cierre_ticket;
                        $newDate3 = date("d-m-Y", strtotime($originalDate3));

                        if ($row->logo_region == 'default.jpg')
                        {
                            ?>
                            <img class="profile-user-img img-responsive img-circle" src="<?php echo base_url() ?>external/img/default.jpg">

                            <?php

                        }else{
                            ?>
                            <img class="profile-user-img img-responsive img-circle" src="<?php echo base_url(); ?>uploads/cliente_region/<?php echo $row->logo_region; ?>">

                            <?php
                        }
                        ?>

                        <h3 class="text-center"><u>Cliente</u></h3>
                        <p class="text-muted text-center"></p>

                        <ul class="list-group list-group-unbordered">
                            <li class="list-group-item">
                                <b>Contacto del Nombre Edificio</b> <a class="pull-right"><?php echo $row->jefe_sucursal; ?></a>
                            </li>
                            <li class="list-group-item">
                                <b>Rut</b> <a class="pull-right"><?php echo $row->rut_region; ?></a>
                            </li>

                            <?php $bodytag = str_replace(",", ", ", $row->jefe_correo_sucursal);
                            ?>



                            <li class="list-group-item">

                                <b>Correo de contacto</b> 
                                <br/>
                                <div style="padding-left: 
                                white-space: nowrap;
                                display: inline;
                                display: inline-block;">
                                <a class="pull-right"><?php echo $bodytag; ?></a>
                            </div>

                        </li>
                            <!--<textarea class="form-control pull-right list-group-item"  name="" id="" cols="30" rows="10">
                                 <a class="pull-right"><?php echo $bodytag; ?></a>
                             </textarea>-->

                             <li class="list-group-item">
                                <b>Telefono</b> <a class="pull-right"><?php echo $row->telefono_sucursal; ?></a>
                            </li>
                            <li class="list-group-item">
                                <b>Nombre Proyecto</b> <a class="pull-right"><?php echo $row->nombre_region; ?></a>
                            </li>
                            <li class="list-group-item">
                                <b>Direccion</b> <a class="pull-right"><?php echo $row->direccion_sucursal; ?></a>
                            </li>
                            <li style="height: 50px;" class="list-group-item">
                                <b>Nombre Edificio</b> <a class="pull-right"><?php echo $row->nombre_sucursal; ?></a>
                            </li>
                            <?php

                            if ($row->recibido_por == true)
                            {
                                ?>
                                <li class="list-group-item">
                                    <b>Recepción conforme</b> <a class="pull-right"><?php echo $row->recibido_por; ?></a>
                                </li>
                                <?php
                            }

                            if ($row->rut_recibe == true)
                            {
                                ?>
                                <li class="list-group-item">
                                    <b>Rut que recibe informe</b> <a class="pull-right"><?php echo $row->rut_recibe; ?></a>
                                </li>
                                <?php
                            }
                            if ($row->email_recibe == true)
                            {
                                ?>
                                <li style="height: 50px;" class="list-group-item">
                                    <b>Email que recibe informe</b> <a class="pull-right"><?php echo $row->email_recibe; ?></a>
                                </li>
                                <?php
                            }


                            if ($row->firma == true)
                            {
                                ?>
                                <li class="list-group-item">
                                    <b>Firma Responsable</b>
                                </li><br />
                                <center><a href="<?php echo base_url(); ?>uploads/firma_tickets/<?php echo $row->firma; ?>" target="_blank">
                                    <img src="<?php echo base_url(); ?>uploads/firma_tickets/<?php echo $row->firma; ?>" alt="" class="img-responsive">
                                </a></center>
                                <?php
                            }
                            ?>

                        </ul>
                    </div>
                    <!-- /.box-body -->
                </div>
                <!-- /.box -->
                
                <?php if($row->nombre_usuario!='' and $row->telefono_usuario != ''  ){  ?>

                    <div class="box box">
                        <div class="box-body box-profile">

                            <?php 

                            if ($row->foto_usuario == 'default.jpg')
                            {
                                ?>
                                <img class="profile-user-img img-responsive img-circle" src="<?php echo base_url() ?>external/img/default.jpg">

                                <?php
                            }else{
                                ?>
                                <img class="profile-user-img img-responsive img-circle" src="<?php echo base_url(); ?>uploads/logos/<?php echo $row->foto_usuario; ?>">

                                <?php
                            }
                            ?>

                            <h3 class="text-center"><u>Especialista</u></h3>

                            <h3 class="profile-username text-center"></h3>

                            <ul class="list-group list-group-unbordered">
                                <li class="list-group-item">
                                    <b>Nombre</b> <a class="pull-right"><?php echo $row->nombre_usuario; ?></a>
                                </li>
                                <li class="list-group-item">
                                    <b>Telefono</b> <a class="pull-right"><?php echo $row->telefono_usuario; ?></a>
                                </li>
                                <li class="list-group-item">
                                    <b>Email</b> <a class="pull-right"><?php echo $row->email_usuario; ?></a>
                                </li>
                                <li class="list-group-item">
                                    <b>Empresa</b> <a class="pull-right"><?php echo $row->nombre_empresa; ?></a>
                                </li>

                                <?php
                                
                                if($row->calificacion == '1')
                                {
                                    ?>
                                    <li class="list-group-item">
                                        <b>Calificación</b> <a class="pull-right">
                                            <img src="<?php echo base_url(); ?>external/img/1.png" alt="" class="img-responsive">

                                        </a>
                                    </li>
                                    <?php

                                }elseif($row->calificacion == '2'){

                                    ?>
                                    <li class="list-group-item">
                                        <b>Calificación</b> <a class="pull-right">
                                            <img src="<?php echo base_url(); ?>external/img/2.png" alt="" class="img-responsive">

                                        </a>
                                    </li>

                                    <?php

                                }elseif($row->calificacion == '3'){

                                    ?>
                                    <li class="list-group-item">
                                        <b>Calificación</b> <a class="pull-right">
                                            <img src="<?php echo base_url(); ?>external/img/3.png" alt="" class="img-responsive">

                                        </a>
                                    </li>

                                    <?php

                                }elseif($row->calificacion == '4'){

                                    ?>
                                    <li class="list-group-item">
                                        <b>Calificación</b> <a class="pull-right">
                                            <img src="<?php echo base_url(); ?>external/img/4.png" alt="" class="img-responsive">

                                        </a>
                                    </li>
                                    <?php

                                }elseif($row->calificacion == '5'){

                                    ?>
                                    <li class="list-group-item">
                                        <b>Calificación</b> <a class="pull-right">
                                            <img src="<?php echo base_url(); ?>external/img/5.png" alt="" class="img-responsive">

                                        </a>
                                    </li>
                                    <?php

                                }else{

                                    ?>
                                    <?php
                                }
                                ?>



                                <?php
                                if($row->calificacion < '4')
                                {
                                    ?>
                                    <?php
                                    if (!empty($row->title_problema))
                                    {        
                                        ?>  
                                        <li class="list-group-item">
                                            <b>Observaciones Calificación de Servicio</b><br>
                                            <a>
                                                <?php echo $row->title_problema;?>
                                            </a>
                                        </li> 
                                        <li class="list-group-item">
                                            <b>Sub-Calificación del Servicio</b><br>
                                            <a>
                                                <?php echo $row->desc_problema;?>
                                            </a>
                                        </li> 
                                        <?php
                                    }
                                    ?>
                                    <?php
                                }
                                ?>     

                            </ul>
                            <li class="list-group-item">
                                <h5 style="text-align: center"><b>Ayudantes</b></h5>
                                <?php
                                if ((!empty($row->ayudantes))&&($row->ayudantes != 'null')) 
                                {

                                 $ayudantes = json_decode($row->ayudantes);
                                 foreach($ayudantes as $ayudante)
                                 {
                                  ?><div >

                                      <b>Nombre</b> <a class="pull-right"><?= @$ayudante->nombre ?></a><br>

                                      <b>Rut</b> <a class="pull-right"><?= @$ayudante->rut ?></a><br><br>
                                  </div>


                              <?php         }
                          } ?>
                      </li><br />
                      <li class="list-group-item">

                        <?php

                        if ((!empty($row->ejecucion_trabajo))&&($row->ejecucion_trabajo != 'null')&&($row->ejecucion_trabajo != 0)) 
                        {

                            if ($row->ejecucion_trabajo == '1') {
                             echo '<b>Ejecución de trabajo:</b> <a class="pull-right">Realizado</a>';
                         }elseif($row->ejecucion_trabajo == '2'){
                          echo '<b>Ejecución de trabajo:</b> <a class="pull-right">No Realizado</a>';

                      }elseif ($row->ejecucion_trabajo == '3') {
                          echo '<b>Ejecución de trabajo:</b> <a class="pull-right">Incompleto</a>';
                      }
                  }

                  ?>
                  <br>

                  
                  
                  
              </li><br />

          </div>
          <!-- /.box-body -->
      </div>

  <?php }?>

  <?php 

  if ($row->pos_x AND $row->pos_y == true)
  {
    ?>
    <div class="box box">
        <div class="box-body box-profile text-center">
            <h2>Ubicación</h2><br />
            <form action="<?php echo site_url('empresas/tickets/tickets/ubicacion'); ?>" target="_blank" method="post">
                <input type="hidden" name="id" value="<?php echo $row->idtickets; ?>">
                <button type="submit" class="btn btn-primary"><i class="fa fa-print"></i> Ver mapa</button>
            </form>
        </div>
        <!-- /.box-body -->
    </div>
    <?php
}               
?>




<div class="table-responsive">

 <?php 

 if ($row->status == '4')
 {

    if(!empty($listadoPreguntasRespuesta)) {
        ?>

        <table  class="table table-bordered table-striped text-center">
            <h2 style="text-align: center;">Necesidades de Reparación</h2>
            <tbody style="border: 3px solid black; ">

             <?php

             foreach ($listadoPreguntasRespuesta as $row1)
             {

                 if($row1->tipo_pregunta == 'Alternativa' or $row1->tipo_pregunta == 'Observacion')
                 {

                     if ((!empty($row1->necesidad))&&($row1->necesidad != 'null')) 
                     {

                        $necesidad_reparacion = json_decode($row1->necesidad);




                        if(is_array($necesidad_reparacion)) {

                            foreach($necesidad_reparacion as $necesidad) {

                                ?>    

                                <tr style="background-color: #8CC9D9; color: white;" >
                                    <th style="width: 30%;">ITEM</th>
                                    <td><?php echo $row1->item_preguntas; ?></td>
                                </tr>
                                <tr>
                                    <th>Se Necesita</th>
                                    <td><?= @$necesidad->se_necesita ?> </td>
                                </tr>
                                <tr>
                                    <th>Ubicado en</th>
                                    <td><?= @$necesidad->ubicado_en ?> </td>
                                </tr>
                                <tr>
                                    <th>Cantidad</th>
                                    <td><?= @$necesidad->cantidad?> </td>
                                </tr>
                                <tr>
                                    <th>Pieza Repuesto</th>
                                    <td><?= @$necesidad->nombre_pieza_repuesto?> </td>
                                </tr>
                                <tr>
                                    <th>Debido a</th>
                                    <td><?= @$necesidad->debido_a?> </td>
                                </tr>
                                <tr>
                                    <th>Plazo Maximo</th>
                                    <td><?= @$necesidad->plazo_estimado?> </td>
                                </tr>
                                <tr>
                                    <th>Observación</th>
                                    <td><?= @$necesidad->observacion?> </td>
                                </tr>
                                <tr>
                                    <th>Foto Área</th>
                                    <td>
                                        <a href="<?php echo base_url(); ?>uploads/fotos_necesidad/<?=@$necesidad->foto_area ?>" target="_blank">
                                            Ver Foto Área
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <th>Foto Componente</th>
                                    <td>
                                        <a href="<?php echo base_url(); ?>uploads/fotos_necesidad/<?=@$necesidad->foto_componente ?>" target="_blank">
                                            Ver Foto Componente
                                        </a>
                                    </td>

                                </tr>
                                <tr>
                                    <th>Validar</th>
                                    <td>

                                        <form class="form" action="<?php echo base_url('supervisor/tickets/tickets/update_necesidad') ?>" method="post">




                                            <input type="radio" disabled class="custom-control-input" name="estado_necesidad" value="1" <?php if(@$necesidad->estado_necesidad == '1'){ echo 'checked';}?> >


                                            <label class="form-check-label" for="exampleCheck1" style="margin-right: 40px;">Si</label>

                                            <input type="radio" disabled class="custom-control-input" name="estado_necesidad" value="2" <?php if(@$necesidad->estado_necesidad == '2'){ echo 'checked';}?> >
                                            <label class="form-check-label" for="exampleCheck1">No</label><br>
                                            <p>Comentario</p>
                                            <textarea name="observacion" readonly type="text" id="" cols="30" rows="3" value="<?php echo @$necesidad->comentario; ?>" ><?php echo @$necesidad->comentario; ?></textarea>
                                            <!--  <button type="submit" class="btn btn-info pull-right btn-submit" style="margin: 10px;"><i class="fa fa-pencil fa fa-white"> </i> Enviar</button> -->

                                        </form>

                                    </td>

                                </tr>
                                <?php 
                            }

                        }
                    }
                }
            }

            ?>
            <br>   
        </tbody>                                
    </table>
    <?php 
} 
}                                
?>
</div>
</div>

<!-- /.col -->
<div class="col-md-7">
    <div class="nav-tabs-custom">
        <ul class="nav nav-tabs">
            <li class="active"><a href="#activity" data-toggle="tab">Detalles</a></li>
            <?php 

            if ($row->status == '2' OR $row->status == '3')
            {
                ?>
                <li><a href="#settings" data-toggle="tab">Comentarios</a></li>
                <?php
            } 

            if ($row->status == '4')
            {
                ?>
                <!-- Botón de Anular -->
            <?php if($row->status !== '7'){ ?>
                 <li> <button type="button" class="btn btn-danger pull-right" style="margin-left: 10px;" data-toggle="modal" data-target="#modal-anulado" data-id="<?php echo $row->idtickets; ?>">
                    <i class="fa fa-times"></i> Anular
                </button></li>
            <?php } ?>

                <!-- Modal de Anulación -->
                <div id="modal-anulado" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">
                            <form id="anular-form">
                                <div style="background: #dd4a4a; color: #fff; text-align: center" class="modal-header">
                                    <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
                                    <h5 id="myModalLabel">Anular ticket</h5>
                                </div>
                                <div class="modal-body">
                                    <input type="hidden" id="idcodigo" name="id" value="" />
                                    <p style="font-size: 20px;" class="text-center">¿Desea anular el ticket?</p>
                                    <div class="box-body">
                                        <div class="form-group">
                                            <label for="inputEmail3" class="col-sm-2 control-label">Observación </label>
                                            <div class="col-sm-10">
                                                <select name="id_motivo_anulacion" id="id_motivo_anulacion" class="form-control">
                                                    <option value="">Seleccione un motivo de anulación</option>
                                                    <?php foreach($listadoMotivoAnulado as $motivo) { ?>
                                                        <option value="<?php echo $motivo->id_motivo_anulacion ?>"><?php echo $motivo->motivo_anulacion ?></option>
                                                    <?php } ?>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button class="btn pull-left" data-dismiss="modal" aria-hidden="true">Cancelar</button>
                                    <button type="submit" class="btn btn-info">Aceptar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                              
                                <?php
                            }
                            ?>
                            <li>
                                <div class="no-print">
                                    <?php 

                                    if ($row->status == 4) 
                                    {
                                     ?>
                                     
                                     <form action="<?php echo site_url('tecnicos/tickets/tickets/imprimir'); ?>" target="_blank" method="post">
                                        <input type="hidden" name="id" value="<?php echo $row->idtickets; ?>">

                                        <button type="submit" class="btn btn-success pull-right"><i class="fa fa-print"></i> Imprimir</button>
                                    </form>
                                    <?php 
                                }
                                
                                ?>        
                            </div>
                        </li>
                    </ul>
                    <div class="tab-content">
                        <div class="active tab-pane" id="activity">

                           <?php 
                            $statusLabel = ''; 

                            if ($row->status == 1) {
                                $statusLabel = '<label class="label label-warning">Creado</label>';
                            } elseif ($row->status == 2) {
                                $statusLabel = '<label class="label label-success">Asignado</label>';
                            } elseif ($row->status == 3) {
                                $statusLabel = '<label class="label label-danger">Pendiente</label>';
                            } elseif ($row->status == 4) {
                                $statusLabel = '<label class="label label-primary">Cerrado</label>';
                            } elseif ($row->status == 5) {
                                $statusLabel = '<label class="label negro">Eliminado</label>';
                            } elseif ($row->status == 7) {
                                $statusLabel = '<label class="label negro">Anulado</label>';
                            }
                            ?>

                            <h4 class="pull-right" id="status-ticket"><?php echo $statusLabel; ?></h4>


                            <h3><u>Requerimiento</u></h3>
                            <hr>

                            <div class="table-responsive">
                                <table class="table table-bordered table-striped text-center">
                                    <tbody>
                                        <tr>
                                            <th style="width: 30%;">Fecha creación</th>
                                            <td><?php echo $row->hora_solicitud." ".$newDate1; ?></td>
                                        </tr>
                                        <?php 

                                        if ($row->coordinador > 0)
                                        {
                                            ?>
                                            <tr>
                                                <th>Solicitante</th>
                                                <td><?php echo $row->nombre_coordinador." "."(".$row->nombre_empresa.")"; ?></td>
                                            </tr>
                                            <tr>
                                                <th>Teléfono solicitante</th>
                                                <td><?php echo $row->telefono_coordinador; ?></td>
                                            </tr>
                                            <tr>
                                                <th>Correo solicitante</th>
                                                <td><?php echo $row->email_coordinador; ?></td>
                                            </tr>
                                            <tr>
                                                <th>Tipo ticket</th>
                                                <td><label class="label label-info">Propios</label></td>
                                            </tr>
                                            <tr>
                                                <th>NIE</th>
                                                <td><?php echo $row->numero_serial; ?></td>
                                            </tr>
                                            <tr>
                                                <th>Activo Fijo</th>
                                                <td><?php echo $row->nombre_activofijo; ?></td>
                                            </tr> 
                                            <tr>
                                                <th>Estado del Activo Fijo</th>
                                                <td><?php echo str_replace('_', ' ', $row->estado_activo_fijo); ?></td>
                                            </tr>                                                   
                                            <tr>
                                                <th>Nombre del Cliente</th>
                                                <td><?php echo $row->nombre_cliente; ?></td>
                                            </tr>
                                            <tr>
                                                <th>Telefono de Contacto</th>
                                                <td><?php echo $row->telefono_contacto; ?></td>
                                            </tr>
                                            <?php


                                        }else{

                                            ?>
                                            <tr>
                                                <th>Solicitante</th>
                                                <td><?php echo $row->contacto_empresa." "."(".$row->nombre_empresa.")"; ?></td>
                                            </tr>
                                            <tr>
                                                <th>Teléfono solicitante</th>
                                                <td><?php echo $row->telefono_empresa; ?></td>
                                            </tr>
                                            <tr>
                                                <th>Correo solicitante</th>
                                                <td><?php echo $row->email_empresa; ?></td>
                                            </tr>
                                            <tr>
                                                <th>Tipo ticket</th>
                                                <td><label class="label label-info">Propios</label></td>
                                            </tr>                                                    
                                            <tr>
                                                <th>NIE</th>
                                                <td><?php echo $row->numero_serial; ?></td>
                                            </tr>
                                            <tr>
                                                <th>Activo Fijo</th>
                                                <td><?php echo $row->nombre_activofijo; ?></td>
                                            </tr>
                                            <tr>
                                                <th>Estado del Activo Fijo</th>
                                                <td><?php echo str_replace('_', ' ', $row->estado_activo_fijo); ?></td>
                                            </tr>
                                            <tr>
                                                <th>Nombre del Cliente</th>
                                                <td><?php echo $row->nombre_cliente; ?></td>
                                            </tr>
                                            <tr>
                                                <th>Telefono de Contacto</th>
                                                <td><?php echo $row->telefono_contacto; ?></td>
                                            </tr>
                                            <?php
                                        }
                                        ?>
                                        <tr>
                                            <th>Hora asistencia</th>
                                            <td><?php echo $row->hora_asistencia; ?></td>
                                        </tr>
                                        <tr>
                                            <th>Fecha asistencia</th>
                                            <td><?php echo $newDate; ?></td>
                                        </tr>
                                        <tr>
                                            <th>OS/OCBS</th>
                                            <td><?php echo $row->orden_servicio; ?></td>
                                        </tr>
                                        <?php 

                                        if ($row->info_adicional AND $row->info_adicional1 == true)
                                        {
                                            ?>
                                            <tr>
                                                <th>Información adicional (Contratista) </th>
                                                <td><?php echo $row->info_adicional; ?></td>
                                            </tr>
                                            <tr>
                                                <th>Información adicional (Empresa) </th>
                                                <td><?php echo $row->info_adicional1; ?></td>
                                            </tr>

                                            <?php
                                        }elseif ($row->info_adicional == true) {

                                            ?>
                                            <tr>
                                                <th>Información adicional (Contratista) </th>
                                                <td><?php echo $row->info_adicional; ?></td>
                                            </tr>

                                            <?php

                                        }elseif ($row->info_adicional1 == true) {

                                            ?>
                                            <tr>
                                                <th>Información adicional (Empresa) </th>
                                                <td><?php echo $row->info_adicional1; ?></td>
                                            </tr>

                                            <?php
                                        }

                                        if ($row->requerimiento == true)
                                        {
                                            ?>
                                            <tr>
                                                <th>Detalle del requerimiento</th>
                                                <td style="white-space: pre-wrap; text-align: left;"><?php echo htmlspecialchars($row->requerimiento); ?></td>
                                            </tr>

                                            <?php
                                        }

                                        if ($row->idareas > 0)
                                        {
                                            ?>
                                            <tr>
                                                <th>Área</th>
                                                <td><?php echo $row->nombre_area; ?></td>
                                            </tr>
                                            <?php
                                        }

                                        if($row->idsla > 0)
                                        {
                                            ?>
                                            <tr>
                                                <th>Tipo SLA</th>
                                                <td><?php echo $row->nombre_tipoSLA; ?></td>
                                            </tr>
                                            <?php
                                        }

                                        if($row->idtipo_horario > 0)
                                        {
                                            ?>
                                            <tr>
                                                <th>Tipo Horario</th>
                                                <td><?php echo $row->nombre_tipo_horario; ?></td>
                                            </tr>
                                            <?php
                                        }

                                        if($row->color_sla_respuesta > 0)
                                        {
                                            if($row->color_sla_respuesta == 1)
                                            {
                                                ?>
                                                <tr>
                                                    <th>Tiempo de Respuesta</th>
                                                    <td>

                                                        <div class="col-xs-12 col-md-12 col-lg-4">
                                                            <div style="margin:0 auto;width: 20px;height: 20px;-moz-border-radius: 50%;-webkit-border-radius: 50%;border-radius: 50%;background: #5cb85c;">&nbsp;</div>
                                                        </div>
                                                        <div class="col-xs-12 col-md-12 col-lg-4">
                                                            <div style="margin:0 auto;width: 20px;height: 20px;-moz-border-radius: 50%;-webkit-border-radius: 50%;border-radius: 50%;background: #fff;border: 1px solid #FFD700;">&nbsp;</div>
                                                        </div>
                                                        <div class="col-xs-12 col-md-12 col-lg-4">
                                                            <div style="margin:0 auto;width: 20px;height: 20px;-moz-border-radius: 50%;-webkit-border-radius: 50%;border-radius: 50%;background: #fff;border: 1px solid red;">&nbsp;</div>
                                                        </div>

                                                        <?php echo $row->tiempo_texto_respuesta; ?>

                                                    </td>
                                                </tr>
                                                <?php

                                            }elseif($row->color_sla_respuesta == 2){

                                                ?>
                                                <tr>
                                                    <th>Tiempo de Respuesta</th>
                                                    <td>

                                                        <div class="col-xs-12 col-md-12 col-lg-4">
                                                            <div style="margin:0 auto;width: 20px;height: 20px;-moz-border-radius: 50%;-webkit-border-radius: 50%;border-radius: 50%;background: #fff;border: 1px solid #5cb85c;">&nbsp;</div>
                                                        </div>
                                                        <div class="col-xs-12 col-md-12 col-lg-4">

                                                            <div style="margin:0 auto;width: 20px;height: 20px;-moz-border-radius: 50%;-webkit-border-radius: 50%;border-radius: 50%;background: #FFD700;">&nbsp;</div>
                                                        </div>
                                                        <div class="col-xs-12 col-md-12 col-lg-4">

                                                            <div style="margin:0 auto;width: 20px;height: 20px;-moz-border-radius: 50%;-webkit-border-radius: 50%;border-radius: 50%;background: #fff;border: 1px solid red;">&nbsp;</div>
                                                        </div>

                                                        <?php echo $row->tiempo_texto_respuesta; ?>

                                                    </td>
                                                </tr>

                                                <?php

                                            }elseif($row->color_sla_respuesta == 3){

                                                ?>
                                                <tr>
                                                    <th>Tiempo de Respuesta</th>
                                                    <td>

                                                        <div class="col-xs-12 col-md-12 col-lg-4">
                                                            <div style="margin:0 auto;width: 20px;height: 20px;-moz-border-radius: 50%;-webkit-border-radius: 50%;border-radius: 50%;background: #fff;border: 1px solid #5cb85c;">&nbsp;</div>
                                                        </div>
                                                        <div class="col-xs-12 col-md-12 col-lg-4">
                                                            <div style="margin:0 auto;width: 20px;height: 20px;-moz-border-radius: 50%;-webkit-border-radius: 50%;border-radius: 50%;background: #fff;border: 1px solid #FFD700;">&nbsp;</div>
                                                        </div>
                                                        <div class="col-xs-12 col-md-12 col-lg-4">
                                                            <div style="margin:0 auto;width: 20px;height: 20px;-moz-border-radius: 50%;-webkit-border-radius: 50%;border-radius: 50%;background: red;">&nbsp;</div>
                                                        </div>

                                                        <?php echo $row->tiempo_texto_respuesta; ?>

                                                    </td>
                                                </tr>

                                                <?php
                                            }
                                        }

                                        if($row->color_sla_solucion > 0)
                                        {
                                            if($row->color_sla_solucion == 1)
                                            {
                                                ?>
                                                <tr>
                                                    <th>Tiempo de Solución</th>
                                                    <td>

                                                        <div class="col-xs-12 col-md-12 col-lg-4">
                                                            <div style="margin:0 auto;width: 20px;height: 20px;-moz-border-radius: 50%;-webkit-border-radius: 50%;border-radius: 50%;background: #5cb85c;">&nbsp;</div>
                                                        </div>
                                                        <div class="col-xs-12 col-md-12 col-lg-4">
                                                            <div style="margin:0 auto;width: 20px;height: 20px;-moz-border-radius: 50%;-webkit-border-radius: 50%;border-radius: 50%;background: #fff;border: 1px solid #FFD700;">&nbsp;</div>
                                                        </div>
                                                        <div class="col-xs-12 col-md-12 col-lg-4">
                                                            <div style="margin:0 auto;width: 20px;height: 20px;-moz-border-radius: 50%;-webkit-border-radius: 50%;border-radius: 50%;background: #fff;border: 1px solid red;">&nbsp;</div>
                                                        </div>

                                                        <?php echo $row->tiempo_texto_solucion; ?>

                                                    </td>
                                                </tr>

                                                <?php

                                            }elseif($row->color_sla_solucion == 2){

                                                ?>
                                                <tr>
                                                    <th>Tiempo de Solución</th>
                                                    <td>

                                                        <div class="col-xs-12 col-md-12 col-lg-4">
                                                            <div style="margin:0 auto;width: 20px;height: 20px;-moz-border-radius: 50%;-webkit-border-radius: 50%;border-radius: 50%;background: #fff;border: 1px solid #5cb85c;">&nbsp;</div>
                                                        </div>
                                                        <div class="col-xs-12 col-md-12 col-lg-4">
                                                            <div style="margin:0 auto;width: 20px;height: 20px;-moz-border-radius: 50%;-webkit-border-radius: 50%;border-radius: 50%;background: #FFD700;">&nbsp;</div>
                                                        </div>
                                                        <div class="col-xs-12 col-md-12 col-lg-4">
                                                            <div style="margin:0 auto;width: 20px;height: 20px;-moz-border-radius: 50%;-webkit-border-radius: 50%;border-radius: 50%;background: #fff;border: 1px solid red;">&nbsp;</div>
                                                        </div>

                                                        <?php echo $row->tiempo_texto_solucion; ?>

                                                    </td>
                                                </tr>

                                                <?php

                                            }elseif($row->color_sla_solucion == 3){

                                                ?>
                                                <tr>
                                                    <th>Tiempo de Solución</th>
                                                    <td>

                                                        <div class="col-xs-12 col-md-12 col-lg-4">
                                                            <div style="margin:0 auto;width: 20px;height: 20px;-moz-border-radius: 50%;-webkit-border-radius: 50%;border-radius: 50%;background: #fff;border: 1px solid #5cb85c;">&nbsp;</div>
                                                        </div>
                                                        <div class="col-xs-12 col-md-12 col-lg-4">
                                                            <div style="margin:0 auto;width: 20px;height: 20px;-moz-border-radius: 50%;-webkit-border-radius: 50%;border-radius: 50%;background: #fff;border: 1px solid #FFD700;">&nbsp;</div>
                                                        </div>
                                                        <div class="col-xs-12 col-md-12 col-lg-4">
                                                            <div style="margin:0 auto;width: 20px;height: 20px;-moz-border-radius: 50%;-webkit-border-radius: 50%;border-radius: 50%;background: red;">&nbsp;</div>
                                                        </div>

                                                        <?php echo $row->tiempo_texto_solucion; ?>

                                                    </td>
                                                </tr>

                                                <?php
                                            }
                                        }

                                        if ($row->observacion == true)
                                        {
                                            ?>
                                            <tr>
                                                <th>Observación ticket pendiente</th>
                                                <td><?php echo $row->observacion; ?></td>
                                            </tr>
                                            <?php
                                        }

                                        if ($row->hora_inicio_trabajo == true) 
                                        {
                                            ?>
                                            <tr>
                                                <th>Inicio de trabajo</th>
                                                <td><?php echo $row->hora_inicio_trabajo." ".$newDate2; ?></td>
                                            </tr>

                                            <tr>
                                                <th>Término de trabajo</th>
                                                <td><?php echo $row->hora_cierre_ticket." ".$newDate3; ?></td>
                                            </tr>
                                            <?php
                                        }
                                        ?>

                                        <!-- CODIGO DE FALLA --> 

                                        <?php
                                        if (!empty($row->codigo_de_fallas)) 
                                         { ?>

                                            <tr align="center">
                                                <th>
                                                    <p><b>Código de fallas</b></p>
                                                    <p> <?php echo $row->codigo_de_fallas; ?> </p>
                                                </th>
                                                <td style="border: 0; padding: 0;">
                                                    <table class="table table-bordered text-center" style="border: 0; margin-bottom: 0px;">
                                                        <?php if (!empty($row->respuesta_1)) 
                                                        { ?> 
                                                            <tr>
                                                                <td>
                                                                    <?php echo $row->respuesta_1; ?>
                                                                </td>
                                                            </tr>
                                                            <?php
                                                        } ?>

                                                        <?php if (!empty($row->respuesta_2)) 
                                                        { ?> 
                                                            <tr>
                                                                <td>
                                                                    <?php echo $row->respuesta_2; ?>
                                                                </td>
                                                            </tr>
                                                            <?php
                                                        } ?>

                                                        <?php if (!empty($row->respuesta_3)) 
                                                        { ?> 
                                                            <tr>
                                                                <td>
                                                                    <?php echo $row->respuesta_3; ?>
                                                                </td>
                                                            </tr>
                                                            <?php
                                                        } ?>

                                                        <?php if (!empty($row->respuesta_4)) 
                                                        { ?> 
                                                            <tr>
                                                                <td>
                                                                    <?php echo $row->respuesta_4; ?>
                                                                </td>
                                                            </tr>
                                                            <?php
                                                        } ?>                                       

                                                    </table>
                                                </td>
                                            </tr>                     
                                            
                                            <?php
                                        }
                                        ?> 

                                        <!-- FIN CODIGO DE FALLA --> 

                                        <!--  TIPO DE PROBLEMA       --> 

                                        <?php
                                        if (!empty($row->nombre)) 
                                        {
                                            ?>
                                            <tr>
                                                <th>Tipo de Problema</th>
                                                <td><?php echo $row->nombre; ?><br>
                                                    <?php echo $row->definicion; ?>
                                                </td>

                                            </tr>

                                            <?php
                                        }
                                        ?>

                                        <!--  TIPO DE PROBLEMA       -->


                                        <!----  SUB_TIPO_PROBLEMA  ---->

                                        <?php
                                        if (!empty($row->tipo_problema)) 
                                        {
                                            ?>
                                            <tr>
                                                <th>Sub tipo de Problema</th>
                                                <td><?php echo $row->tipo_problema; ?></td>
                                            </tr>
                                            <?php
                                        }
                                        ?>

                                        <!----  SUB_TIPO_PROBLEMA  ---->

                                        <!--    NECESIDAD DE REPARACION     -->

                                        <?php
                                        if ((!empty($row->necesidad_reparacion))&&($row->necesidad_reparacion != 'null')) 
                                        {
                                            $necesidad_reparacion = json_decode($row->necesidad_reparacion);

                                            if(is_array($necesidad_reparacion)) {

                                                ?>
                                                <tr>
                                                    <th>Necesidad de Reparación</th>
                                                    <td style="padding: 0;">
                                                        <table class="table table-bordered table-striped text-center" style= "margin-bottom:0;">
                                                            <tr>    
                                                                <td>
                                                                    <b>Se necesita</b>
                                                                </td>                                                                   
                                                                <td>
                                                                    <b>Ubicado en</b>
                                                                </td>
                                                                <td>
                                                                    <b>Debido a</b>
                                                                </td>
                                                                <td>
                                                                    <b>Plazo estimado</b>
                                                                </td>
                                                            </tr>                                                           

                                                            <?php                                                               

                                                            foreach($necesidad_reparacion as $necesidad) {

                                                                echo '<tr>';

                                                                echo '<td width="25%">'.@$necesidad->se_necesita.'</td>';
                                                                echo '<td width="25%">'.@$necesidad->ubicado_en.'</td>';
                                                                echo '<td width="25%">'.@$necesidad->debido_a.'</td>';
                                                                echo '<td width="25%">'.@$necesidad->observacion.'</td>';

                                                                echo '</tr>';
                                                            }

                                                            ?>       

                                                        </table>
                                                    </td>

                                                </tr>

                                                <?php
                                            }
                                            ?>

                                            <?php
                                        }
                                        ?>


                                        <!--    NECESIDAD DE REPARACION     -->    

                                        <!-- CODIGO DE RESCATE --> 

                                        <?php
                                        if (!empty($row->quien_rescata || $row->fecha_rescate || $row->hora_rescate )) 
                                         { ?>

                                            <tr align="center">
                                                <th>
                                                    <p><b>Rescate</b></p>

                                                </th>
                                                <td style="border: 0; padding: 0;">
                                                    <table class="table table-bordered text-center" style="border: 0; margin-bottom: 0px;">
                                                        <?php if (!empty($row->quien_rescata)) 
                                                        { ?> 
                                                            <tr>
                                                                <td>
                                                                    <?php echo $row->quien_rescata; ?>
                                                                </td>
                                                            </tr>
                                                            <?php
                                                        } ?>

                                                        <?php if (!empty($row->fecha_rescate)) 
                                                        { ?> 
                                                            <tr>
                                                                <td>
                                                                    <?php echo $row->fecha_rescate; ?>
                                                                </td>
                                                            </tr>
                                                            <?php
                                                        } ?>

                                                        <?php if (!empty($row->hora_rescate)) 
                                                        { ?> 
                                                            <tr>
                                                                <td>
                                                                    <?php echo $row->hora_rescate; ?>
                                                                </td>
                                                            </tr>
                                                            <?php
                                                        } ?>                                     

                                                    </table>
                                                </td>
                                            </tr>                     
                                            
                                            <?php
                                        }
                                        ?> 

                                        <!-- FIN CODIGO DE RESCATE -->    

                                        <!-- FIN RESCATE  -->

                                        <?php                                           
                                        if ($row->imagen == true)
                                        {
                                            ?>
                                            <tr>
                                                <th>Material de apoyo del requerimiento</th>
                                                <td>
                                                    <a href="<?php echo base_url(); ?>uploads/tickets/<?php echo $row->imagen; ?>" target="_blank">
                                                        <img src="<?php echo base_url(); ?>uploads/tickets/<?php echo $row->imagen; ?>" alt="" style="width: 200px;">
                                                    </a>
                                                </td>
                                            </tr>
                                            <?php
                                        }
                                        ?>
                                    </tbody>
                                </table>
                            </div>

<style>
    .card-inspeccion {
        border: 1px solid #d2d6de;
        background: #fff;
        border-radius: 5px;
        margin-bottom: 15px;
        padding: 15px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        border-left: 5px solid #3c8dbc;
    }
    .titulo-pregunta {
        font-size: 16px;
        color: #333;
        font-weight: bold;
        display: block;
        margin-bottom: 10px;
        border-bottom: 1px solid #f4f4f4;
        padding-bottom: 8px;
    }
    .contenedor-respuestas {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 10px;
    }
    .tag-respuesta {
        background-color: #e9ecef;
        color: #2c3e50;
        padding: 6px 15px;
        border-radius: 50px;
        font-size: 13px;
        border: 1px solid #dee2e6;
        font-weight: 600;
    }
    .img-miniatura {
        width: 80px;
        height: 80px;
        object-fit: cover;
        border-radius: 4px;
        margin: 5px;
        border: 1px solid #ddd;
    }
</style>

<hr>
<h3><i class="fa fa-shield"></i> <u>Área Prevención de Riesgos (Área 8)</u></h3>
<br>

<div class="row">
    <div class="col-md-12">
        <?php if(!empty($listadoPreguntasRespuesta)): ?>
            
            <?php foreach ($listadoPreguntasRespuesta as $resp): ?>
                <div class="card-inspeccion">
                    <span class="titulo-pregunta">
                        <i class="fa fa-dot-circle-o text-blue"></i> <?php echo $resp->preguntas; ?>
                    </span>

                    <div class="row">
                        <div class="col-md-8">
                            <div class="contenedor-respuestas">
                                <?php 
                                $items = explode(',', $resp->valor_respuesta);
                                foreach ($items as $it): 
                                    if(trim($it) != ''):
                                ?>
                                    <span class="tag-respuesta">
                                        <i class="fa fa-check-circle text-success"></i> <?php echo trim($it); ?>
                                    </span>
                                <?php 
                                    endif;
                                endforeach; 
                                ?>
                            </div>

                            <?php if (!empty($resp->comentarios)): ?>
                                <div class="well well-sm no-shadow" style="margin-top: 10px; background-color: #fcfcfc;">
                                    <strong><i class="fa fa-commenting text-muted"></i> Observación:</strong><br>
                                    <span class="text-muted"><?php echo $resp->comentarios; ?></span>
                                </div>
                            <?php endif; ?>
                        </div> <div class="col-md-4 text-right">
                            <?php 
                            $imgs = array_filter([$resp->imagen, $resp->imagen1, $resp->imagen2, $resp->imagen3, $resp->imagen4, $resp->imagen5, $resp->imagen6, $resp->imagen7]);
                            if (!empty($imgs)): ?>
                                <div class="galeria">
                                    <?php foreach ($imgs as $archivo): ?>
                                        <a href="<?php echo base_url("uploads/fotos_tickets/$archivo"); ?>" target="_blank">
                                            <img src="<?php echo base_url("uploads/fotos_tickets/$archivo"); ?>" class="img-miniatura">
                                        </a>
                                    <?php endforeach; ?>
                                </div>
                            <?php else: ?>
                                <small class="text-muted italic">Sin evidencia fotográfica</small>
                            <?php endif; ?>
                        </div> </div> </div> <?php endforeach; ?>

        <?php else: ?>
            <div class="alert alert-info text-center">
                <i class="fa fa-info-circle"></i> No se encontraron registros de inspección.
            </div>
        <?php endif; ?>
    </div> </div>
                            

                            

                        <?php

                        if ($row->status == '2' OR $row->status == '3')
                        {
                            ?>
                            <div class="tab-pane" id="settings">
                                <div class="box-footer">
                                    <form name="register" id="register" method="post" action="">
                                        <div class="input-group">

                                            <input type="hidden" name="id" value="<?php echo $row->idtickets; ?>" class="form-control" autocomplete="off">

                                            <div class="form-group">
                                                <div class="col-sm-12">
                                                    <textarea name="observaciones" placeholder="Ingrese comentarios" rows="4" class="form-control"></textarea>
                                                </div>
                                            </div>

                                            <span class="input-group-btn">
                                                <button type="submit" id="enviar-btn" class="btn btn-primary btn-flat">Enviar</button>
                                            </span>
                                        </div>
                                    </form>
                                </div>
                                <div id="resp"></div>
                                <hr />
                                <ul class="timeline">
                                    <?php 

                                    if ( count($listado) > 0 ) 
                                    {
                                        foreach ( $listado as $row2 ) 
                                        {
                                            $originalDate4 = $row2->fecha_solicitud;
                                            $newDate4 = date("d-m-Y", strtotime($originalDate4));
                                            ?>
                                            <li class="time-label">
                                                <span class="bg-red">
                                                    <?php echo $row2->hora_solicitud." ".$newDate4; ?>
                                                </span>
                                            </li>
                                            <li>
                                                <i class="fa fa-envelope bg-blue"></i>
                                                <div class="timeline-item">

                                                    <h3 class="timeline-header"><?php echo $row2->nombre_usuario; ?></h3>

                                                    <div class="timeline-body">
                                                        <?php echo $row2->observaciones; ?>
                                                    </div>
                                                </div>
                                            </li>
                                            <?php
                                        }
                                    }else{

                                        ?>
                                        <li>
                                            <div class="timeline-item">
                                                <div class="timeline-body">
                                                    No hay comentarios
                                                </div>
                                            </div>
                                        </li>
                                        <?php
                                    }
                                    ?>
                                </ul>
                            </div>
                            <!-- /.tab-pane -->
                            <?php

                        }else{

                            ?>
                            <div class="tab-pane" id="settings">
                                <ul class="timeline">
                                    <?php 

                                    if ( count($listado) > 0 ) 
                                    {
                                        foreach ( $listado as $row2 ) 
                                        {
                                            $originalDate4 = $row2->fecha_solicitud;
                                            $newDate4 = date("d-m-Y", strtotime($originalDate4));
                                            ?>
                                            <li class="time-label">
                                                <span class="bg-red">
                                                    <?php echo $row2->hora_solicitud." ".$newDate4; ?>
                                                </span>
                                            </li>
                                            <li>
                                                <i class="fa fa-envelope bg-blue"></i>
                                                <div class="timeline-item">

                                                    <h3 class="timeline-header"><?php echo $row2->nombre_usuario; ?></h3>

                                                    <div class="timeline-body">
                                                        <?php echo $row2->observaciones; ?>
                                                    </div>
                                                </div>
                                            </li>
                                            <?php
                                        }
                                    }else{

                                        ?>
                                        <li>
                                            <div class="timeline-item">
                                                <div class="timeline-body">
                                                    No hay comentarios
                                                </div>
                                            </div>
                                        </li>
                                        <?php
                                    }
                                    ?>
                                </ul>
                            </div>
                            <!-- /.tab-pane -->
                            <?php
                        }
                        ?>

                        <div class="tab-pane" id="presupuesto">
                            <?php 

                            if ($listadoPresupuestoTicket == true)
                            {
                                if ($listadoPresupuestoTicket->status == '2' )
                                {
                                    ?>
                                    <table>
                                        <tr>
                                            <td>
                                                <form action="<?php echo site_url('empresas/presupuesto/presupuesto/show'); ?>" method="post" target="_blank">
                                                    <input type="hidden" name="id" value="<?php echo $listadoPresupuestoTicket->idpresupuesto; ?>">

                                                    <button type="submit" class="btn btn-default btn-flat" style="color:#00a65a;"><i class="fa fa-cart-plus"></i></button>
                                                </form>
                                            </td>
                                        </tr>
                                    </table>
                                    <?php
                                }else{

                                }
                                ?>

                                <?php
                            }else{

                                ?>

                                <form action="<?php echo site_url('empresas/tickets/tickets/presupuestoPropiosCosto'); ?>" id="add_presupuesto" method="post" class="form-horizontal" enctype="multipart/form-data">

                                    <input type="hidden" name="id" value="<?php echo $row->idtickets; ?>">
                                    <input type="hidden" name="asignado" value="<?php echo $row->empresa; ?>">
                                    <input type="hidden" name="estado" value="2">

                                    <div class="form-group">
                                        <label for="inputEmail3" class="col-sm-2 control-label">Presupuesto <span style="color:red;">*</span></label>
                                        <div class="col-sm-10">
                                            <select name="referencia" class="form-control">
                                                <option value="">Seleccione una opción</option>

                                                <?php 

                                                foreach ($listadoDataCostoPropios as $row4)
                                                {
                                                    ?>
                                                    <option value="<?php echo $row4->idpresupuesto ?>"><?php echo $row4->codigo_correlativo." | ".$row4->subtotal." | ".$row4->referencia;?></option>

                                                    <?php
                                                }
                                                ?>
                                            </select>
                                        </div>
                                    </div>

                                    <div class="box-footer">
                                        <button type="submit" class="btn btn-info pull-right"><i class="fa fa-pencil fa fa-white"> </i> Asignar Presupuesto</button>
                                    </div>

                                </form>
                                <?php

                            }
                            ?>
                        </div>

                        <div class="tab-pane" id="presupuesto1">
                            <?php 

                            if ($listadoPresupuestoTicketVenta == true)
                            {
                                if ($listadoPresupuestoTicketVenta->status == '2' )
                                {
                                    ?>
                                    <table>
                                        <tr>
                                            <td>
                                                <form action="<?php echo site_url('empresas/presupuesto/presupuesto/show'); ?>" method="post" target="_blank">
                                                    <input type="hidden" name="id" value="<?php echo $listadoPresupuestoTicketVenta->idpresupuesto; ?>">

                                                    <button type="submit" class="btn btn-default btn-flat" style="color:#00a65a;"><i class="fa fa-cart-plus"></i></button>
                                                </form>
                                            </td>
                                            <td colspan="5">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
                                            <td>
                                                <form action="<?php echo site_url('empresas/tickets/tickets/presupuestoPropiosVenta'); ?>" method="post">

                                                    <input type="hidden" name="id" value="<?php echo $listadoPresupuestoTicketVenta->idtickets; ?>">

                                                    <input type="hidden" name="referencia" value="<?php echo $listadoPresupuestoTicketVenta->idpresupuesto; ?>">

                                                    <input type="hidden" name="estado" value="1">

                                                    <button type="submit" class="btn btn-danger">Eliminar</button>
                                                </form>                                            
                                            </td>
                                        </tr>
                                    </table>
                                    <?php

                                }else{

                                }

                                ?>

                                <?php

                            }else{

                                ?>
                                <form action="<?php echo site_url('empresas/tickets/tickets/presupuestoPropiosVenta'); ?>" id="add_presupuesto" method="post" class="form-horizontal" enctype="multipart/form-data">

                                    <input type="hidden" name="id" value="<?php echo $row->idtickets; ?>">
                                    <input type="hidden" name="asignado" value="<?php echo $row->empresa; ?>">
                                    <input type="hidden" name="estado" value="2">

                                    <div class="form-group">
                                        <label for="inputEmail3" class="col-sm-2 control-label">Presupuesto <span style="color:red;">*</span></label>
                                        <div class="col-sm-10">
                                            <select name="referencia" class="form-control">
                                                <option value="">Seleccione una opción</option>

                                                <?php 

                                                foreach ($listadoDataVentaPropios as $row3)
                                                {
                                                    ?>
                                                    <option value="<?php echo $row3->idpresupuesto ?>"><?php echo $row3->codigo_correlativo." | ".$row3->subtotal." | ".$row3->referencia;?></option>

                                                    <?php
                                                }
                                                ?>
                                            </select>
                                        </div>
                                    </div>

                                    <div class="box-footer">
                                        <button type="submit" class="btn btn-info pull-right"><i class="fa fa-pencil fa fa-white"> </i> Asignar Presupuesto</button>
                                    </div>

                                </form>
                                <?php
                            }
                            ?>
                        </div>

                    </div>
                    <!-- /.tab-content -->
                </div>
                <!-- /.nav-tabs-custom -->
            </div>
            <!-- /.col -->
        </div>
        <!-- /.row -->

    </section>
    <!-- /.content -->
</div>
<!-- /.content-wrapper -->
<div class="show">
    <a id="button"></a>
</div>
<script src="<?php echo base_url();?>external/plugins/jQuery/jquery-2.2.3.min.js"></script>
<script src="https://code.jquery.com/ui/1.11.4/jquery-ui.min.js"></script>
<script>

 $(document).ready(function() {

  var btn = $('#button');


  $(window).scroll(function() {
    if ($(this).scrollTop() > 0) {
      $('#button').fadeIn();
  } else {
     $('#button').fadeOut();
 }
});


  btn.on('click', function(e) {
    e.preventDefault();
    $('html, body').animate({scrollTop:0}, '500');
});


  var btn = $('#button');

  $(window).scroll(function() {
    if ($(window).scrollTop() > 300) {
      btn.addClass('show');
  } else {
      btn.removeClass('show');
  }
});

  btn.on('click', function(e) {
    e.preventDefault();
    $('html, body').animate({scrollTop:0}, '300');
});


});

</script>

<script>
$(document).ready(function() {
    // Al hacer clic en el botón de anular
    $('[data-toggle="modal"]').on('click', function() {
        var ticketId = $(this).data('id'); // Obtener el ID del ticket
        $('#idcodigo').val(ticketId); // Asignar el ID al campo oculto en el modal
    });

    // Mostrar el mensaje flash si existe
    if ($('#flash-message').length) {
        $('#flash-message').fadeIn('slow'); // Mostrar el mensaje
        // Ocultar el mensaje flash después de 3 segundos
        setTimeout(function() {
            $('#flash-message').fadeOut('slow');
        }, 4000); 
    }

    // Enviar el formulario por AJAX
    $('#anular-form').on('submit', function(e) {
        e.preventDefault(); // Prevenir el envío normal del formulario
        var formData = $(this).serialize(); // Serializar los datos del formulario

        $.ajax({
            type: 'POST',
            url: '<?php echo base_url(); ?>empresas/tickets/tickets/ticketEnviarAnuladoAjax', // URL del controlador
            data: formData,
            dataType: 'json',
            success: function(response) {
                // Mostrar el mensaje de éxito
                if (response.success) {
                    $('#modal-anulado').modal('hide'); // Cerrar el modal
                    // Actualizar el estado en la vista
                    $('#status-ticket').html('<label class="label negro">Anulado</label>').css('color', 'black');

                    // Redirigir para mostrar el mensaje flash
                    location.reload(); // Recargar la página para mostrar el mensaje flash
                } else {
                    alert(response.message); // Mostrar mensaje de error
                }
            },
            error: function() {
                alert('Error al anular el ticket. Inténtalo de nuevo.');
            }
        });
    });
});
</script>


