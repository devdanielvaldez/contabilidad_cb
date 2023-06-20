const db = require('../services/db');
const pdfkit = require('pdfkit');
const fs = require('fs');

const addExtraordinaryPayments = async (req, res) => {
    try {
      const { student_id, examen, excursion, graduacion, periodo } = req.body;
  
      // Validar el formato del periodo (YYYY-YYYY)
      const periodRegex = /^\d{4}-\d{4}$/;
      if (!periodRegex.test(periodo)) {
        return res.status(400).json({
          ok: false,
          msg: 'Formato de periodo inválido. El formato debe ser YYYY-YYYY.',
        });
      }
  
      // Verificar si el periodo ya existe en la tabla
      const existingPeriod = await db.query(
        `SELECT * FROM pagos_extraordinarios WHERE periodo = '${periodo}' LIMIT 1`
      );
  
      if (existingPeriod.length > 0) {
        return res.status(400).json({
          ok: false,
          msg: 'El periodo ya existe. Por favor, elige otro periodo.',
        });
      }
  
      // Registrar los pagos extraordinarios
      await db.query(
        `INSERT INTO pagos_extraordinarios (student_id, examen, excursion, graduacion, periodo)
        VALUES (${student_id}, ${examen}, ${excursion}, ${graduacion}, '${periodo}')`
      );
  
      return res.status(200).json({
        ok: true,
        msg: 'Pagos extraordinarios registrados correctamente.',
      });
    } catch (err) {
      console.log('Error in addExtraordinaryPayments:', err);
      return res.status(500).json({
        ok: false,
        msg: 'Se ha producido un error inesperado, por favor contacta al administrador del sistema.',
        error: err,
      });
    }
  };

  const updateExtraordinaryPayments = async (req, res) => {
    try {
      const { pago_id, examen, excursion, graduacion, periodo } = req.body;
  
      // Verificar si el pago_id existe en la tabla
      const existingPayment = await db.query(
        `SELECT * FROM pagos_extraordinarios WHERE pago_id = ${pago_id} LIMIT 1`
      );
  
      if (existingPayment.length === 0) {
        return res.status(404).json({
          ok: false,
          msg: 'El pago extraordinario no existe.',
        });
      }
  
      // Actualizar los pagos extraordinarios
      await db.query(
        `UPDATE pagos_extraordinarios
        SET examen = ${examen}, excursion = ${excursion}, graduacion = ${graduacion}, periodo = '${periodo}'
        WHERE pago_id = ${pago_id}`
      );
  
      return res.status(200).json({
        ok: true,
        msg: 'Pagos extraordinarios actualizados correctamente.',
      });
    } catch (err) {
      console.log('Error in updateExtraordinaryPayments:', err);
      return res.status(500).json({
        ok: false,
        msg: 'Se ha producido un error inesperado, por favor contacta al administrador del sistema.',
        error: err,
      });
    }
  };

  const addExtraordinaryPaymentsByStudentAndPeriod = async (req, res) => {
    try {
      const { student_id, periodo, examen, excursion, graduacion } = req.body;
  
      // Verificar si ya existe un pago extraordinario para el estudiante y periodo dado
      const existingPayment = await db.query(
        `SELECT * FROM pagos_extraordinarios WHERE student_id = ${student_id} AND periodo = '${periodo}'`
      );
  
      if (existingPayment.length > 0) {
        return res.status(400).json({
          ok: false,
          msg: 'Ya existe un pago extraordinario registrado para este estudiante y periodo.',
        });
      }
  
      // Registrar el pago extraordinario por estudiante y periodo
      await db.query(
        `INSERT INTO pagos_extraordinarios (student_id, periodo, examen, excursion, graduacion)
        VALUES (${student_id}, '${periodo}', ${examen}, ${excursion}, ${graduacion})`
      );
  
      return res.status(200).json({
        ok: true,
        msg: 'Pago extraordinario por estudiante y periodo registrado correctamente.',
      });
    } catch (err) {
      console.log('Error in addExtraordinaryPaymentsByStudentAndPeriod:', err);
      return res.status(500).json({
        ok: false,
        msg: 'Se ha producido un error inesperado, por favor contacta al administrador del sistema.',
        error: err,
      });
    }
  };
  
  const savePaymentReceipt = async (req, res) => {
  try {
    const { student_id, monto, fecha_pago, concepto } = req.body;

    // Registrar el recibo de pago en la base de datos
    const result = await db.query(
      `INSERT INTO recibos_pagos (student_id, monto, fecha_pago, concepto)
      VALUES (${student_id}, ${monto}, '${fecha_pago}', '${concepto}')`
    );

    const reciboId = result.insertId; // Obtener el ID del recibo recién insertado

    // Crear un nuevo archivo PDF para el recibo
    const doc = new pdfkit();

    doc.pipe(fs.createWriteStream(`recibo_${reciboId}.pdf`));

    doc.fontSize(18).text('RECIBO DE PAGO', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Estudiante: ${student_id}`);
    doc.text(`Monto: ${monto}`);
    doc.text(`Fecha de Pago: ${fecha_pago}`);
    doc.text(`Concepto: ${concepto}`);

    doc.end();

    return res.status(200).json({
      ok: true,
      msg: 'Recibo de pago guardado y archivo PDF generado correctamente.',
      recibo_id: reciboId,
    });
  } catch (err) {
    console.log('Error in savePaymentReceipt:', err);
    return res.status(500).json({
      ok: false,
      msg: 'Se ha producido un error inesperado, por favor contacta al administrador del sistema.',
      error: err,
    });
  }
};
  

  module.exports = {
    addExtraordinaryPayments,
    updateExtraordinaryPayments,
    addExtraordinaryPaymentsByStudentAndPeriod,
    savePaymentReceipt
  }