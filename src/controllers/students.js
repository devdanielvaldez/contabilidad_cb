const helper = require('../../helper');
const db = require('../services/db');

const find_all_students = async (req, res) => {
  try {
    const { id, name, last_name, email, username } = req.query;

    let query = `SELECT student_id, first_name, last_name, phone, email, since, username, parent_id, cuotas_mensuales, inscripcion_monto, inscripcion_estado
                   FROM student
                   WHERE 1 = 1`;

    if (id) {
      query += ` AND student_id = ${id}`;
    }

    if (name) {
      query += ` AND first_name LIKE '%${name}%'`;
    }

    if (last_name) {
      query += ` AND last_name LIKE '%${last_name}%'`;
    }

    if (email) {
      query += ` AND email LIKE '%${email}%'`;
    }

    if (username) {
      query += ` AND username LIKE '%${username}%'`;
    }

    const rows = await db.query(query);
    const data = helper.emptyOrRows(rows);

    return res.status(200).json({
      ok: true,
      data: data,
    });
  } catch (err) {
    console.log('Error in find_all_students:', err);
    return res.status(500).json({
      ok: false,
      msg: 'Se ha producido un error inesperado, por favor contacte al administrador del sistema.',
      error: err,
    });
  }
};

const addMonthlyFee = async (req, res) => {
  try {
    const { student_id } = req.params;
    const { cuota } = req.body;

    if (cuota < 1800) return res.status(400).json({
      ok: false,
      msg: "Debe ingresar un monto mayor o igual 1,800 DOP."
    })

    // Validar existencia del estudiante
    const student = await db.query(
      `SELECT * FROM student WHERE student_id = ${student_id}`
    );
    if (student.length === 0) {
      return res.status(404).json({
        ok: false,
        msg: 'Estudiante no encontrado',
      });
    }

    // Validar el valor de cuotas_mensuales
    const cuotasMensuales = student[0].cuotas_mensuales;
    if (cuotasMensuales !== null && cuotasMensuales > 0) {
      return res.status(400).json({
        ok: false,
        msg: 'El estudiante ya tiene cuotas mensuales registradas',
      });
    }

    // Validar la inscripción
    const inscripcionEstado = student[0].inscripcion_estado;
    const inscripcionMonto = student[0].inscripcion_monto;

    if (inscripcionEstado === 0 && inscripcionMonto == null) {
      return res.status(400).json({
        ok: false,
        msg: 'Primero se debe pagar la inscripción',
      });
    }

    if (inscripcionMonto === 0 || inscripcionMonto == null) {
      return res.status(400).json({
        ok: false,
        msg: 'Aún no hay monto asignado a la inscripción. Debes completar el proceso de inscripción primero.',
      });
    }

    // Actualizar cuotas_mensuales con el valor recibido
    await db.query(
      `UPDATE student SET cuotas_mensuales = ${cuota} WHERE student_id = ${student_id}`
    );

    // Agregar registros a la tabla cuotas_mensuales
    const meses = [
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
    ];

    for (const mes of meses) {
      await db.query(
        `INSERT INTO cuotas_mensuales (student_id, mes, estado, monto_a_pagar, monto_pagado) VALUES (${student_id}, '${mes}', 'PE', ${cuota}, 0)`
      );
    }

    return res.status(200).json({
      ok: true,
      msg: 'Cuota mensual agregada exitosamente',
    });
  } catch (err) {
    console.log('Error in addMonthlyFee:', err);
    return res.status(500).json({
      ok: false,
      msg: 'Se ha producido un error inesperado, por favor contacte al administrador del sistema.',
      error: err,
    });
  }
};

const registerInscription = async (req, res) => {
  try {
    const { student_id, monto, pagado } = req.body;

    // Validar existencia del estudiante
    const student = await db.query(
      `SELECT * FROM student WHERE student_id = ${student_id}`
    );

    if (student.length === 0) {
      return res.status(404).json({
        ok: false,
        msg: 'Estudiante no encontrado',
      });
    }

    // Validar si el estudiante ya ha pagado la inscripción
    const inscripcionPagado = student[0].inscripcion_estado;
    if (inscripcionPagado) {
      return res.status(400).json({
        ok: false,
        msg: 'El estudiante ya ha pagado la inscripción',
      });
    }

    // Actualizar la inscripción en la tabla student
    let updateQuery = `UPDATE student SET inscripcion_estado = ${pagado ? 1 : 0}`;

    if (monto !== null) {
      const inscripcionMonto = student[0].inscripcion_monto;
      if (inscripcionMonto > 0) {
        return res.status(400).json({
          ok: false,
          msg: 'El estudiante ya tiene un monto de inscripción registrado',
        });
      }

      updateQuery += `, inscripcion_monto = ${monto}`;
    }

    updateQuery += ` WHERE student_id = ${student_id}`;

    await db.query(updateQuery);

    return res.status(200).json({
      ok: true,
      msg: 'Inscripción registrada exitosamente',
      student: student[0],
      monto: monto == null ? student[0].inscripcion_monto : monto,
      pagado: pagado
    });
  } catch (err) {
    console.log('Error in registerInscription:', err);
    return res.status(500).json({
      ok: false,
      msg: 'Se ha producido un error inesperado, por favor contacte al administrador del sistema.',
      error: err,
    });
  }
};

const getStudentPayments = async (req, res) => {
  try {
    const { student_id } = req.params;

    // Consultar información del estudiante
    const student = await db.query(
      `SELECT * FROM student WHERE student_id = ${student_id}`
    );

    if (student.length === 0) {
      return res.status(404).json({
        ok: false,
        msg: 'Estudiante no encontrado',
      });
    }

    // Obtener cuotas mensuales del estudiante
    const cuotasMensuales = await db.query(
      `SELECT * FROM cuotas_mensuales WHERE student_id = ${student_id}`
    );

    // Calcular monto pagado y monto pendiente de pago
    let montoPagado = 0;
    cuotasMensuales.forEach((cuota) => {
      const montoPagadoCuota = parseFloat(cuota.monto_pagado) || 0;
      montoPagado += montoPagadoCuota;
      const montoAPagarCuota = parseFloat(cuota.monto_a_pagar) || 0;
      cuota.pendiente_de_pago = montoAPagarCuota - montoPagadoCuota;
    });

    const montoPendiente = cuotasMensuales.reduce((total, cuota) => {
      const montoPagadoCuota = parseFloat(cuota.monto_pagado) || 0;
      const montoAPagarCuota = parseFloat(cuota.monto_a_pagar) || 0;
      if (montoPagadoCuota !== montoAPagarCuota) {
        return total + (montoAPagarCuota - montoPagadoCuota);
      }
      return total;
    }, 0);


    // Verificar y corregir el campo "mes" si está en blanco
    cuotasMensuales.forEach((cuota) => {
      if (cuota.mes === '') {
        cuota.mes = 'diciembre';
      }
    });

    // Obtener información de la inscripción
    const inscripcionMonto = student[0].inscripcion_monto;
    const inscripcionPagado = student[0].inscripcion_estado;

    // Devolver respuesta con los datos actualizados
    return res.status(200).json({
      ok: true,
      student_id: student[0].student_id,
      general: {
        first_name: student[0].first_name,
        last_name: student[0].last_name
      },
      cuotas: cuotasMensuales,
      monto_pagado: montoPagado,
      monto_pendiente: montoPendiente,
      inscripcion: {
        monto: inscripcionMonto,
        estado: inscripcionPagado,
      },
    });
  } catch (err) {
    console.log('Error in getStudentPayments:', err);
    return res.status(500).json({
      ok: false,
      msg: 'Se ha producido un error inesperado, por favor contacte al administrador del sistema.',
      error: err,
    });
  }
};

const registerPaymentAbono = async (req, res) => {
  try {
    const { student_id, monto, concepto } = req.body;

    // Verificar si el estudiante existe
    const student = await db.query(
      `SELECT * FROM student WHERE student_id = ${student_id}`
    );

    if (student.length === 0) {
      return res.status(404).json({
        ok: false,
        msg: 'Estudiante no encontrado',
      });
    }

    // Verificar si el concepto es válido
    const validConcepts = ['Abono a inscripcion', 'Abono a colegiatura', 'Graduacion', 'Excursiones', 'Examenes'];
    if (!validConcepts.includes(concepto)) {
      return res.status(400).json({
        ok: false,
        msg: 'Concepto inválido',
      });
    }

    // Obtener la fecha actual
    const fecha = new Date();

    // Insertar el abono en la tabla de abonos
    await db.query(
      `INSERT INTO abonos (student_id, monto, concepto, fecha)
      VALUES (${student_id}, ${monto}, '${concepto}', '${fecha.toISOString()}')`
    );

    // Actualizar campos en la tabla student si el concepto es "Abono a inscripcion"
    if (concepto === 'Abono a inscripcion') {
      const inscripcionMonto = student[0].inscripcion_monto || 0;
      const totalInscripcionMonto = inscripcionMonto + monto;
      const inscripcionEstado = req.body.inscripcion_estado ? 1 : 0;

      await db.query(
        `UPDATE student
            SET inscripcion_monto = ${totalInscripcionMonto}, inscripcion_estado = ${inscripcionEstado}
            WHERE student_id = ${student_id}`
      );
    }

    // Actualizar pagos de colegiatura en la tabla cuotas_mensuales si el concepto es "Abono a colegiatura"
    if (concepto === 'Abono a colegiatura') {
      const cuotasMensuales = await db.query(
        `SELECT * FROM cuotas_mensuales WHERE student_id = ${student_id}`
      );

      let montoRestante = monto;

      for (const cuota of cuotasMensuales) {
        if (montoRestante <= 0) {
          break;
        }

        const montoPendiente = cuota.monto_a_pagar - (cuota.monto_pagado || 0);

        if (montoPendiente > 0) {
          const montoAbonado = Math.min(montoRestante, montoPendiente);
          cuota.monto_pagado = (cuota.monto_pagado || 0) + montoAbonado;
          montoRestante -= montoAbonado;
        }

        if (cuota.monto_pagado >= cuota.monto_a_pagar && montoRestante > 0) {
          cuota.estado = 'PA'; // Cambiar el estado de la cuota a "PA" (pagada)
        }

        await db.query(
          `UPDATE cuotas_mensuales
          SET monto_pagado = ${cuota.monto_pagado}, estado = '${cuota.estado}'
          WHERE id = ${cuota.id}`
        );
      }
    }

    return res.status(200).json({
      ok: true,
      msg: 'Abono registrado exitosamente',
      student: student[0],
      monto: monto,
      concepto: concepto
    });
  } catch (err) {
    console.log('Error in registerPayment:', err);
    return res.status(500).json({
      ok: false,
      msg: 'Se ha producido un error inesperado, por favor contacte al administrador del sistema.',
      error: err,
    });
  }
};

const registerPaymentCuota = async (req, res) => {
  try {
    const { cuota_id, monto } = req.body;

    // Verificar si la cuota existe
    const cuota = await db.query(
      `SELECT * FROM cuotas_mensuales WHERE id = ${cuota_id}`
    );

    if (cuota.length === 0) {
      return res.status(404).json({
        ok: false,
        msg: 'Cuota no encontrada',
      });
    }

    // Calcular el monto pendiente de pago
    const montoPendiente = cuota[0].monto_a_pagar - cuota[0].monto_pagado;

    // Verificar si el monto ingresado es mayor al monto pendiente de pago
    if (monto > montoPendiente) {
      const extra = monto - montoPendiente;
      return res.status(400).json({
        ok: false,
        msg: `El monto ingresado es mayor al monto pendiente de pago en la cuota. Debe realizar un abono de $${extra} para poder continuar.`,
      });
    }

    // Verificar si el monto ingresado es menor al monto pendiente de pago
    if (monto < montoPendiente) {
      return res.status(400).json({
        ok: false,
        msg: 'El monto ingresado es menor al monto pendiente de pago en la cuota.',
      });
    }

    // Actualizar el monto pagado de la cuota actual
    await db.query(
      `UPDATE cuotas_mensuales
      SET monto_pagado = monto_pagado + ${monto}, estado = 'PA'
      WHERE id = ${cuota_id}`
    );

    const student = await db.query(`SELECT * FROM student WHERE student_id = ${cuota[0].student_id}`);
      console.log('finish')
    return res.status(200).json({
      ok: true,
      msg: 'Pago registrado exitosamente',
      student: student[0],
      cuota: cuota[0]
    });
  } catch (err) {
    console.log('Error in registerPaymentCuota:', err);
    return res.status(500).json({
      ok: false,
      msg: 'Se ha producido un error inesperado, por favor contacte al administrador del sistema.',
      error: err,
    });
  }
};

module.exports = {
  find_all_students,
  addMonthlyFee,
  registerInscription,
  getStudentPayments,
  registerPaymentAbono,
  registerPaymentCuota
}