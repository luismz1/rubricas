const express = require('express');
const pool = require('./config/db'); // Importar la conexión a la base de datos
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();

// Middleware para habilitar CORS y analizar JSON
app.use(cors()); // Habilita CORS para permitir solicitudes desde tu frontend
app.use(express.json()); // Analiza las solicitudes JSON

// Ruta para crear una rúbrica con criterios, subcriterios y columnas
app.post('/rubricas/crear', async (req, res) => {
  const {
    titulo, descripcion, cantidad_criterios, cantidad_columnas, creador_id, publica,
    fecha_creacion, autor, area_general, area_especifica, aspecto_evaluar, criterios
  } = req.body;

  if (!titulo || !descripcion || !cantidad_criterios || !cantidad_columnas || !creador_id) {
    return res.status(400).json({ error: 'Faltan datos obligatorios.' });
  }

  try {
    // 1. Guardar la rúbrica principal
    const resultRubrica = await pool.query(
      `INSERT INTO Rubricas (Titulo, Descripcion, Cantidad_Criterios, Cantidad_Columnas, Creador_ID, Publica, FechaCreacion, Autor, AreaGeneral, AreaEspecifica, AspectoEvaluar)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING Rubrica_ID`,
      [titulo, descripcion, cantidad_criterios, cantidad_columnas, creador_id, publica || false, fecha_creacion, autor, area_general, area_especifica, aspecto_evaluar]
    );
    const rubricaId = resultRubrica.rows[0].rubrica_id;

    // 2. Guardar los criterios
    for (const [indexCriterio, criterio] of criterios.entries()) {
      const resultCriterio = await pool.query(
        `INSERT INTO Criterios (Rubrica_ID, NombreCriterio, Orden) VALUES ($1, $2, $3) RETURNING Criterio_ID`,
        [rubricaId, criterio.nombre, indexCriterio]
      );
      const criterioId = resultCriterio.rows[0].criterio_id;

      // 3. Guardar los subcriterios (filas) de cada criterio
      for (const [indexSubcriterio, subcriterio] of criterio.subcriterios.entries()) {
        const resultSubcriterio = await pool.query(
          `INSERT INTO Subcriterios (Criterio_ID, Descripcion, Porcentaje, Orden) VALUES ($1, $2, $3, $4) RETURNING Subcriterio_ID`,
          [criterioId, subcriterio.descripcion, subcriterio.porcentaje, indexSubcriterio]
        );
        const subcriterioId = resultSubcriterio.rows[0].subcriterio_id;

        // 4. Guardar las columnas asociadas a cada subcriterio
        for (const [indexColumna, columna] of subcriterio.columnas.entries()) {
          await pool.query(
            `INSERT INTO Columnas (Subcriterio_ID, TextoColumna, Orden) VALUES ($1, $2, $3)`,
            [subcriterioId, columna.textoColumna, indexColumna]
          );
        }
      }
    }

    // Respuesta exitosa
    res.status(201).json({ message: 'Rúbrica creada exitosamente', rubricaId });

  } catch (error) {
    console.error('Error al crear la rúbrica:', error);
    res.status(500).json({ error: 'Hubo un error al crear la rúbrica.' });
  }
});

app.put('/rubricas/actualizar/:id', async (req, res) => {
  const { id } = req.params;
  const { criterios, ...restoDatosRubrica } = req.body;

  try {
    if ('rubrica_id' in restoDatosRubrica) {
      delete restoDatosRubrica.rubrica_id; 
    }

    // Actualiza la rúbrica principal
    const rubricaKeys = Object.keys(restoDatosRubrica);
    const rubricaValues = Object.values(restoDatosRubrica);

    const updateRubricaQuery = `
      UPDATE rubricas
      SET ${rubricaKeys.map((key, index) => `${key} = $${index + 1}`).join(', ')}
      WHERE rubrica_id = $${rubricaKeys.length + 1}
    `;
    await pool.query(updateRubricaQuery, [...rubricaValues, id]);

    const criterioIds = criterios.map(c => c.criterio_id).filter(id => id);

    if (criterioIds.length > 0) {
      const deleteCriteriosQuery = `
        DELETE FROM criterios
        WHERE rubrica_id = $1 AND criterio_id NOT IN (${criterioIds.map((_, index) => `$${index + 2}`).join(', ')})
      `;
      await pool.query(deleteCriteriosQuery, [id, ...criterioIds]);
    } else {
      await pool.query('DELETE FROM criterios WHERE rubrica_id = $1', [id]);
    }

    for (let criterio of criterios) {
      const { criterio_id, subcriterios, ...restoDatosCriterio } = criterio;

      let criterioId;
      if (criterio_id) {
        const criterioKeys = Object.keys(restoDatosCriterio);
        const criterioValues = Object.values(restoDatosCriterio);
        const updateCriterioQuery = `
          UPDATE criterios
          SET ${criterioKeys.map((key, index) => `${key} = $${index + 1}`).join(', ')}
          WHERE criterio_id = $${criterioKeys.length + 1}
          RETURNING criterio_id
        `;
        const { rows: criterioResult } = await pool.query(updateCriterioQuery, [...criterioValues, criterio_id]);
        criterioId = criterioResult[0].criterio_id;
      } else {
        const criterioKeys = Object.keys(restoDatosCriterio);
        const criterioValues = Object.values(restoDatosCriterio);
        const insertCriterioQuery = `
          INSERT INTO criterios (${criterioKeys.join(', ')}, rubrica_id)
          VALUES (${criterioKeys.map((_, index) => `$${index + 1}`).join(', ')}, $${criterioKeys.length + 1})
          RETURNING criterio_id
        `;
        const { rows: criterioResult } = await pool.query(insertCriterioQuery, [...criterioValues, id]);
        criterioId = criterioResult[0].criterio_id;
      }

      const subcriterioIds = subcriterios.map(s => s.subcriterio_id).filter(id => id);

      if (subcriterioIds.length > 0) {
        const deleteSubcriteriosQuery = `
          DELETE FROM subcriterios
          WHERE criterio_id = $1 AND subcriterio_id NOT IN (${subcriterioIds.map((_, index) => `$${index + 2}`).join(', ')})
        `;
        await pool.query(deleteSubcriteriosQuery, [criterioId, ...subcriterioIds]);
      } else {
        await pool.query('DELETE FROM subcriterios WHERE criterio_id = $1', [criterioId]);
      }

      for (let subcriterio of subcriterios) {
        const { subcriterio_id, columnas, ...restoDatosSubcriterio } = subcriterio;

        let subcriterioId;
        if (subcriterio_id) {
          const subcriterioKeys = Object.keys(restoDatosSubcriterio);
          const subcriterioValues = Object.values(restoDatosSubcriterio);
          const updateSubcriterioQuery = `
            UPDATE subcriterios
            SET ${subcriterioKeys.map((key, index) => `${key} = $${index + 1}`).join(', ')}
            WHERE subcriterio_id = $${subcriterioKeys.length + 1}
            RETURNING subcriterio_id
          `;
          const { rows: subcriterioResult } = await pool.query(updateSubcriterioQuery, [...subcriterioValues, subcriterio_id]);
          subcriterioId = subcriterioResult[0].subcriterio_id;
        } else {
          const subcriterioKeys = Object.keys(restoDatosSubcriterio);
          const subcriterioValues = Object.values(restoDatosSubcriterio);
          const insertSubcriterioQuery = `
            INSERT INTO subcriterios (${subcriterioKeys.join(', ')}, criterio_id)
            VALUES (${subcriterioKeys.map((_, index) => `$${index + 1}`).join(', ')}, $${subcriterioKeys.length + 1})
            RETURNING subcriterio_id
          `;
          const { rows: subcriterioResult } = await pool.query(insertSubcriterioQuery, [...subcriterioValues, criterioId]);
          subcriterioId = subcriterioResult[0].subcriterio_id;
        }

        const columnaIds = columnas.map(c => c.columna_id).filter(id => id);

        if (columnaIds.length > 0) {
          const deleteColumnasQuery = `
            DELETE FROM columnas
            WHERE subcriterio_id = $1 AND columna_id NOT IN (${columnaIds.map((_, index) => `$${index + 2}`).join(', ')})
          `;
          await pool.query(deleteColumnasQuery, [subcriterioId, ...columnaIds]);
        } else {
          await pool.query('DELETE FROM columnas WHERE subcriterio_id = $1', [subcriterioId]);
        }

        for (let columna of columnas) {
          const { columna_id, orden, ...restoDatosColumna } = columna; // Asegurarse de incluir "orden"

          if (columna_id) {
            const columnaKeys = Object.keys(restoDatosColumna);
            const columnaValues = Object.values(restoDatosColumna);
            const updateColumnaQuery = `
              UPDATE columnas
              SET ${columnaKeys.map((key, index) => `${key} = $${index + 1}`).join(', ')}, orden = $${columnaKeys.length + 1}
              WHERE columna_id = $${columnaKeys.length + 2}
            `;
            await pool.query(updateColumnaQuery, [...columnaValues, orden, columna_id]);
          } else {
            const columnaKeys = Object.keys(restoDatosColumna);
            const columnaValues = Object.values(restoDatosColumna);
            const insertColumnaQuery = `
              INSERT INTO columnas (${columnaKeys.join(', ')}, orden, subcriterio_id)
              VALUES (${columnaKeys.map((_, index) => `$${index + 1}`).join(', ')}, $${columnaKeys.length + 1}, $${columnaKeys.length + 2})
            `;
            await pool.query(insertColumnaQuery, [...columnaValues, orden, subcriterioId]);
          }
        }
      }
    }

    res.status(200).send('Rúbrica actualizada correctamente');
  } catch (error) {
    console.error('Error al actualizar la rúbrica:', error);

    if (error.code === '42701') {
      return res.status(400).send('Error: la columna rubrica_id fue especificada más de una vez.');
    }

    res.status(500).send('Error al actualizar la rúbrica');
  }
});


app.get('/rubricas', async (req, res) => {
  try {
    const result = await pool.query('SELECT rubrica_id, titulo FROM Rubricas');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener las rúbricas:', error);
    res.status(500).json({ error: 'Error al obtener las rúbricas' });
  }
});

// app.get para obtener evaluadores
app.get('/evaluadores', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT CONCAT(Usuarios.Nombre, ' ', Usuarios.Apellido, ' (Correo: ', Usuarios.Correo, ')') AS nombre,
             Usuarios.Usuario_ID
      FROM Usuarios
      INNER JOIN RolesAsignados ON RolesAsignados.Usuario_ID = Usuarios.Usuario_ID
      WHERE RolesAsignados.TipoUsuario_ID = 2
    `);
    res.json(result.rows); // Enviar los datos de los evaluadores
  } catch (error) {
    console.error('Error al obtener los evaluadores:', error);
    res.status(500).json({ error: 'Error al obtener los evaluadores' });
  }
});


app.get('/propuestas', async (req, res) => {
  try {
    const result = await pool.query('SELECT id_solicitud, descripcion, tipo_solicitud_origen FROM vista_solicitudes');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener las propuestas:', error);
    res.status(500).json({ error: 'Error al obtener las propuestas' });
  }
});

// Ruta para obtener estadísticas de una rúbrica por su ID
app.get('/rubrica/:id/statistics', async (req, res) => {
  const { id } = req.params;

  try {
    // Consulta para obtener la cantidad de veces que se ha utilizado la rúbrica
    const usosResult = await pool.query(`
      SELECT COUNT(*) as usos
      FROM ResultadosRubrica
      WHERE Rubrica_ID = $1
    `, [id]);
    const usos = usosResult.rows[0].usos;

    // Consulta para obtener el promedio, mediana, moda, nota mínima y nota máxima
    const statsResult = await pool.query(`
      SELECT 
        ROUND(AVG(Resultado), 2) as promedio, -- Promedio de los resultados
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY Resultado) as mediana, -- Mediana de los resultados
        MIN(Resultado) as nota_minima, -- Nota mínima
        MAX(Resultado) as nota_maxima -- Nota máxima
      FROM ResultadosRubrica
      WHERE Rubrica_ID = $1;
    `, [id]);

    const stats = statsResult.rows[0];

    if (!stats) {
      return res.status(404).json({ error: 'No se encontraron estadísticas para esta rúbrica' });
    }

    res.json({
      estadisticas: {
        usos: usos || 0,
        promedio: stats.promedio || 0,
        mediana: stats.mediana || 0,
        nota_minima: stats.nota_minima || 0,
        nota_maxima: stats.nota_maxima || 0,
      }
    });
  } catch (error) {
    console.error('Error al obtener las estadísticas de la rúbrica:', error);
    res.status(500).json({ error: 'Error al obtener las estadísticas de la rúbrica' });
  }
});


app.post('/rubricapropuesta', async (req, res) => {
  const { rubrica_id, propuesta_id, tipo_propuesta } = req.body;

  try {
    // Verificar si la asociación ya existe
    const rubricExists = await pool.query(
      'SELECT * FROM RubricaPropuesta WHERE rubrica_id = $1 AND propuesta_id = $2 AND tipopropuesta = $3',
      [rubrica_id, propuesta_id, tipo_propuesta]
    );

    // Si ya existe, devolver un mensaje de advertencia
    if (rubricExists.rows.length > 0) {
      return res.status(409).json({ error: 'Esta rúbrica ya se encuentra asociada a este tipo de propuesta' });
    }

    // Paso 1: Insertar la nueva asignación de la rubrica
    const result = await pool.query(
      'INSERT INTO RubricaPropuesta (rubrica_id, propuesta_id, tipopropuesta) VALUES ($1, $2, $3) RETURNING rubricapropuesta_id',
      [rubrica_id, propuesta_id, tipo_propuesta]
    );
    
    const rubricapropuesta_id = result.rows[0].rubricapropuesta_id;
    
    // Paso 2: Buscar todas las asociaciones en RubricaPropuesta que coincidan con propuesta_id y tipo_propuesta
    const evaluadoresAsociados = await pool.query(
      'SELECT evaluadorpropuesta_id FROM EvaluadorPropuesta WHERE propuesta_id = $1 AND tipopropuesta = $2',
      [propuesta_id, tipo_propuesta]
    );

    // Si no hay asociaciones en RubricaPropuesta, simplemente devolver un mensaje exitoso sin más procesamiento
    if (evaluadoresAsociados.rows.length === 0) {
      return res.status(200).json({ message: 'Asignación realizada. No hay rúbricas asociadas a esta propuesta y tipo de propuesta.' });
    }

    // Paso 3: Por cada rúbrica asociada, verificar si ya está en AsignacionPropuesta y si no, insertarla
    for (const evaluadorpropuesta of evaluadoresAsociados.rows) {
      const evaluadorpropuesta_id = evaluadorpropuesta.evaluadorpropuesta_id;

      // Verificar si ya existe en AsignacionPropuestas
      const asignacionExistente = await pool.query(
        'SELECT * FROM AsignacionPropuestas WHERE rubricapropuesta_id = $1 AND evaluadorpropuesta_id = $2',
        [rubricapropuesta_id, evaluadorpropuesta_id]
      );

      // Si no existe, insertar la nueva relación en AsignacionPropuesta
      if (asignacionExistente.rows.length === 0) {
      // Ejemplo de inserción sin especificar el EstadoPropuesta
      await pool.query(
        'INSERT INTO AsignacionPropuestas (RubricaPropuesta_ID, EvaluadorPropuesta_ID, EstadoPropuesta) VALUES ($1, $2, $3)',
        [rubricapropuesta_id, evaluadorpropuesta_id, 1] // El valor 1 es el EstadoPropuesta que representa 'Asignada'
      );      
      }
    }

    res.status(200).json({ message: 'Asignación de evaluador y propuesta realizada correctamente.' });

  } catch (error) {
    console.error('Error al asignar el evaluador a la propuesta:', error);
    res.status(500).json({ error: 'Error al asignar el evaluador a la propuesta.' });
  }
});

app.post('/evaluadorpropuesta', async (req, res) => {
  const { evaluador_id, propuesta_id, tipo_propuesta } = req.body;

  try {
    // Verificar si la asociación ya existe
    const evaluatorExits = await pool.query(
      'SELECT * FROM EvaluadorPropuesta WHERE evaluador_id = $1 AND propuesta_id = $2 AND tipopropuesta = $3',
      [evaluador_id, propuesta_id, tipo_propuesta]
    );

    // Si ya existe, devolver un mensaje de advertencia
    if (evaluatorExits.rows.length > 0) {
      return res.status(409).json({ error: 'Esta rúbrica ya se encuentra asociada a este tipo de propuesta' });
    }


    // Paso 1: Insertar la nueva asignación del evaluador
    const result = await pool.query(
      'INSERT INTO EvaluadorPropuesta (evaluador_id, propuesta_id, tipopropuesta) VALUES ($1, $2, $3) RETURNING evaluadorpropuesta_id',
      [evaluador_id, propuesta_id, tipo_propuesta]
    );
    
    const evaluadorpropuesta_id = result.rows[0].evaluadorpropuesta_id;
    
    // Paso 2: Buscar todas las asociaciones en RubricaPropuesta que coincidan con propuesta_id y tipo_propuesta
    const rubricasAsociadas = await pool.query(
      'SELECT rubricapropuesta_id FROM RubricaPropuesta WHERE propuesta_id = $1 AND tipopropuesta = $2',
      [propuesta_id, tipo_propuesta]
    );

    // Si no hay asociaciones en RubricaPropuesta, simplemente devolver un mensaje exitoso sin más procesamiento
    if (rubricasAsociadas.rows.length === 0) {
      return res.status(200).json({ message: 'Asignación realizada. No hay rúbricas asociadas a esta propuesta y tipo de propuesta.' });
    }

    // Paso 3: Por cada rúbrica asociada, verificar si ya está en AsignacionPropuesta y si no, insertarla
    for (const rubricapropuesta of rubricasAsociadas.rows) {
      const rubricapropuesta_id = rubricapropuesta.rubricapropuesta_id;

      // Verificar si ya existe en AsignacionPropuestas
      const asignacionExistente = await pool.query(
        'SELECT * FROM AsignacionPropuestas WHERE rubricapropuesta_id = $1 AND evaluadorpropuesta_id = $2',
        [rubricapropuesta_id, evaluadorpropuesta_id]
      );

      // Si no existe, insertar la nueva relación en AsignacionPropuesta
      if (asignacionExistente.rows.length === 0) {
      // Ejemplo de inserción sin especificar el EstadoPropuesta
      await pool.query(
        'INSERT INTO AsignacionPropuestas (RubricaPropuesta_ID, EvaluadorPropuesta_ID, EstadoPropuesta) VALUES ($1, $2, $3)',
        [rubricapropuesta_id, evaluadorpropuesta_id, 1] // El valor 1 es el EstadoPropuesta que representa 'Asignada'
      );      
      }
    }

    res.status(200).json({ message: 'Asignación de evaluador y propuesta realizada correctamente.' });

  } catch (error) {
    console.error('Error al asignar el evaluador a la propuesta:', error);
    res.status(500).json({ error: 'Error al asignar el evaluador a la propuesta.' });
  }
});

app.get('/evaluador/:id/propuestas-evaluacion', async (req, res) => {
  const evaluadorId = req.params.id;

  try {
    // 1. Obtener todas las propuestas asociadas al evaluador en EvaluadorPropuesta
    const evaluadorPropuestas = await pool.query(
      `SELECT EvaluadorPropuesta_ID, Propuesta_ID, TipoPropuesta 
       FROM EvaluadorPropuesta 
       WHERE Evaluador_ID = $1`,
      [evaluadorId]
    );

    if (evaluadorPropuestas.rows.length === 0) {
      return res.status(404).json({ message: 'No se encontraron propuestas asociadas para este evaluador.' });
    }

    // Extraer los EvaluadorPropuesta_ID
    const evaluadorPropuestaIds = evaluadorPropuestas.rows.map(row => row.evaluadorpropuesta_id);

    // 2. Buscar en AsignacionPropuestas las que tengan EvaluadorPropuesta_ID y EstadoPropuesta = 1
    const asignacionPropuestas = await pool.query(
      `SELECT Asignacion_ID, RubricaPropuesta_ID, EvaluadorPropuesta_ID 
       FROM AsignacionPropuestas 
       WHERE EvaluadorPropuesta_ID = ANY($1::int[]) AND EstadoPropuesta = 1`,
      [evaluadorPropuestaIds]
    );

    if (asignacionPropuestas.rows.length === 0) {
      return res.status(404).json({ message: 'No hay propuestas asignadas disponibles.' });
    }

    // 3. Obtener la propuesta_id y tipo_propuesta de RubricaPropuesta
    const rubricaPropuestaIds = asignacionPropuestas.rows.map(row => row.rubricapropuesta_id);
    const rubricas = await pool.query(
      `SELECT RubricaPropuesta.RubricaPropuesta_ID, RubricaPropuesta.Propuesta_ID, 
              RubricaPropuesta.TipoPropuesta, Rubricas.Titulo, Rubricas.Rubrica_ID 
       FROM RubricaPropuesta 
       JOIN Rubricas ON RubricaPropuesta.Rubrica_ID = Rubricas.Rubrica_ID 
       WHERE RubricaPropuesta.RubricaPropuesta_ID = ANY($1::int[])`,
      [rubricaPropuestaIds]
    );

    if (rubricas.rows.length === 0) {
      return res.status(404).json({ message: 'No se encontraron propuestas en RubricaPropuesta.' });
    }

    // Extraer las tuplas (propuesta_id, tipo_propuesta)
    const propuestaTuplas = rubricas.rows.map(row => ({
      propuesta_id: row.propuesta_id,
      tipo_propuesta: row.tipopropuesta
    }));

    // 4. Buscar las descripciones de las propuestas en Vista_Solicitudes
    const consultaVista = await pool.query(
      `SELECT id_solicitud, Descripcion, tipo_solicitud_origen 
       FROM Vista_Solicitudes 
       WHERE (id_solicitud, tipo_solicitud_origen) IN (SELECT unnest($1::int[]), unnest($2::text[]))`,
      [propuestaTuplas.map(p => p.propuesta_id), propuestaTuplas.map(p => p.tipo_propuesta)]
    );

    if (consultaVista.rows.length === 0) {
      return res.status(404).json({ message: 'No se encontraron descripciones en Vista_Solicitudes para las propuestas.' });
    }

    // 5. Formar la respuesta final separando rubrica.titulo y descripcionVista
    const propuestasFinales = asignacionPropuestas.rows.map(asignacion => {
      const rubrica = rubricas.rows.find(r => r.rubricapropuesta_id === asignacion.rubricapropuesta_id);
      const descripcionVista = consultaVista.rows.find(v => v.id_solicitud === rubrica.propuesta_id)?.descripcion || 'Descripción no encontrada';

      return {
        asignacion_id: asignacion.asignacion_id,
        rubrica_titulo: rubrica?.titulo || 'Sin título',
        descripcion: descripcionVista,
        rubrica_id: rubrica?.rubrica_id || null
      };
    });
    
    res.json(propuestasFinales); // Devolver el resultado final con título y descripción separados
  } catch (error) {
    console.error('Error al obtener propuestas para evaluación:', error);
    res.status(500).json({ error: 'Error al obtener propuestas para evaluación.' });
  }
});


// Ruta para obtener las rúbricas públicas
app.get('/rubricas/publicas', async (req, res) => {
  try {
    const result = await pool.query('SELECT Rubrica_ID, Titulo, Autor FROM Rubricas WHERE Publica = true');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener las rúbricas públicas:', error);
    res.status(500).json({ error: 'Error al obtener las rúbricas públicas.' });
  }
});

// Ruta para obtener todas las rúbricas disponibles
app.get('/rubricas/disponibles', async (req, res) => {
  try {
    // Consulta para obtener todas las rúbricas de la tabla Rubricas
    const result = await pool.query(
      'SELECT Rubrica_ID, Titulo, Autor, Publica FROM Rubricas'
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener las rúbricas disponibles:', error);
    res.status(500).json({ error: 'Error al obtener las rúbricas disponibles.' });
  }
});

// Ruta para obtener las rúbricas creadas por un usuario específico
app.get('/rubricas/creadas/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Asegúrate de que la consulta sea correcta y devuelva las rúbricas creadas por el usuario
    const result = await pool.query(
      'SELECT Rubrica_ID, Titulo, Autor FROM Rubricas WHERE Creador_ID = $1',
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener las rúbricas creadas:', error);
    res.status(500).json({ error: 'Error al obtener las rúbricas creadas.' });
  }
});

app.post('/evaluar_rubrica', async (req, res) => {
  const { rubric_id, asignacionId, resultados, observaciones } = req.body; // Desestructuramos para obtener 'observaciones'

  if (!Array.isArray(resultados)) {
    return res.status(400).json({ error: 'Formato incorrecto, se esperaba un array de resultados' });
  }

  // Creamos un objeto para almacenar la suma de porcentajes por criterio
  const criterios = {};

  // Procesamos cada subcriterio recibido
  resultados.forEach((subcriterio) => {
    const {porcentaje_asignado, criterio_id } = subcriterio;

    // Si el criterio aún no está en la lista, lo agregamos
    if (!criterios[criterio_id]) {
      criterios[criterio_id] = {
        criterio_id,
        total_porcentaje: 0,
      };
    }

    // Sumamos el porcentaje del subcriterio al criterio correspondiente
    criterios[criterio_id].total_porcentaje += porcentaje_asignado;
  });

  // Sumamos todos los porcentajes por criterio para calcular el total de la rúbrica
  let totalRubrica = 0;
  Object.values(criterios).forEach(criterio => {
    totalRubrica += criterio.total_porcentaje;
  });

  try {
    // Empezamos una transacción
    await pool.query('BEGIN');

    // 1. Actualizamos el estado de la propuesta en AsignacionPropuestas
    await pool.query(
      'UPDATE AsignacionPropuestas SET EstadoPropuesta = 2 WHERE Asignacion_ID = $1',
      [asignacionId]
    );

    // 2. Insertamos un nuevo registro en ResultadosRubrica, incluyendo las observaciones si existen
    const resultadoInsert = await pool.query(
      'INSERT INTO ResultadosRubrica (Asignacion_ID, Rubrica_ID, Resultado, Observaciones) VALUES ($1, $2, $3, $4) RETURNING Resultado_ID',
      [asignacionId, rubric_id, totalRubrica, observaciones || ''] // Enviamos blank si no hay observaciones
    );
    const resultadoId = resultadoInsert.rows[0].resultado_id;

    // 3. Insertamos en CriteriosEvaluados por cada criterio
    for (const criterio of Object.values(criterios)) {
      const criterioInsert = await pool.query(
        'INSERT INTO CriteriosEvaluados (Resultado_ID, Criterio_ID, PorcentajeAsignado) VALUES ($1, $2, $3) RETURNING CriterioEvaluado_ID',
        [resultadoId, criterio.criterio_id, criterio.total_porcentaje]
      );
      const criterioEvaluadoId = criterioInsert.rows[0].criterioevaluado_id;

      // 4. Insertamos en SubCriteriosEvaluados por cada subcriterio asociado al criterio
      for (const subcriterio of resultados.filter(r => r.criterio_id === criterio.criterio_id)) {
        await pool.query(
          'INSERT INTO SubcriteriosEvaluados (CriterioEvaluado_ID, Subcriterio_ID, PuntosObtenidos, PorcentajeAsignado) VALUES ($1, $2, $3, $4)',
          [criterioEvaluadoId, subcriterio.subcriterio_id, subcriterio.puntos_obtenidos, subcriterio.porcentaje_asignado]
        );
      }
    }

    // Hacemos commit de la transacción
    await pool.query('COMMIT');
    
    res.json({
      mensaje: 'Evaluación procesada y guardada con éxito',
      totalRubrica,
      criterios,
    });

  } catch (error) {
    // En caso de error, revertimos la transacción
    await pool.query('ROLLBACK');
    console.error('Error al procesar la evaluación:', error);
    res.status(500).json({ error: 'Ocurrió un error al procesar la evaluación.' });
  }
});


app.get('/get_associations', async (req, res) => {
  try {
    const result = await pool.query(`
    SELECT 
      ap.asignacion_id AS asociacion_id,
      CONCAT(r.AreaGeneral, ' - ', r.AreaEspecifica) AS nombre_rubrica,
      r.AspectoEvaluar AS tipo,
      vs.fecha_creacion AS fecha,
      ep.TipoEstado AS estado
    FROM 
      AsignacionPropuestas ap
    JOIN RubricaPropuesta rp ON ap.RubricaPropuesta_ID = rp.RubricaPropuesta_ID
    JOIN Rubricas r ON rp.Rubrica_ID = r.Rubrica_ID
    JOIN EstadoPropuesta ep ON ap.EstadoPropuesta = ep.Estado_ID
    LEFT JOIN Vista_Solicitudes vs ON rp.Propuesta_ID = vs.id_solicitud and rp.tipopropuesta = vs.tipo_solicitud_origen
    `);
    
    res.json(result.rows); // Devolvemos las filas resultantes al frontend
  } catch (error) {
    console.error('Error al obtener asociaciones:', error);
    res.status(500).json({ error: 'Ocurrió un error al obtener las asociaciones.' });
  }
});

app.get('/get_reconstructed_rubric/:asignacionId', async (req, res) => {
  const { asignacionId } = req.params;

  try {
    // Obtener la rúbrica asociada a la asignación
    const rubricaResult = await pool.query(`
      SELECT r.*, rr.Observaciones, rr.Resultado
      FROM AsignacionPropuestas ap
      JOIN RubricaPropuesta rp ON ap.RubricaPropuesta_ID = rp.RubricaPropuesta_ID
      JOIN Rubricas r ON rp.Rubrica_ID = r.Rubrica_ID
      LEFT JOIN ResultadosRubrica rr ON ap.Asignacion_ID = rr.Asignacion_ID
      WHERE ap.Asignacion_ID = $1
    `, [asignacionId]);

    if (rubricaResult.rows.length === 0) {
      return res.status(404).json({ message: 'Rúbrica no encontrada' });
    }

    const rubrica = rubricaResult.rows[0];

    // Obtener los criterios evaluados y sus porcentajes asignados
    const criteriosEvaluadosResult = await pool.query(`
      SELECT ce.CriterioEvaluado_ID, ce.Criterio_ID, ce.PorcentajeAsignado, c.NombreCriterio
      FROM CriteriosEvaluados ce
      JOIN Criterios c ON ce.Criterio_ID = c.Criterio_ID
      WHERE ce.Resultado_ID = (
        SELECT rr.Resultado_ID FROM ResultadosRubrica rr WHERE rr.Asignacion_ID = $1
      )
    `, [asignacionId]);

    const criterios = criteriosEvaluadosResult.rows;

    // Iterar sobre los criterios y obtener los subcriterios evaluados y las columnas
    for (const criterio of criterios) {
      const subcriteriosEvaluadosResult = await pool.query(`
        SELECT se.SubcriterioEvaluado_ID, se.Subcriterio_ID, se.PuntosObtenidos, sc.Descripcion, sc.Porcentaje
        FROM SubcriteriosEvaluados se
        JOIN Subcriterios sc ON se.Subcriterio_ID = sc.Subcriterio_ID
        WHERE se.CriterioEvaluado_ID = $1
      `, [criterio.criterioevaluado_id]);

      criterio.subcriterios = subcriteriosEvaluadosResult.rows;

      // Obtener las columnas para cada subcriterio y marcar la columna seleccionada
      for (const subcriterio of criterio.subcriterios) {
        const columnasResult = await pool.query(
          'SELECT * FROM Columnas WHERE Subcriterio_ID = $1 ORDER BY Orden',
          [subcriterio.subcriterio_id]
        );

        // Marcamos la columna seleccionada comparando con PuntosObtenidos
        subcriterio.columnas = columnasResult.rows.map((columna) => ({
          ...columna,
          selected: columna.orden === subcriterio.puntosobtenidos  // Marca si esta columna fue seleccionada
        }));
      }
    }

    // Devolver la rúbrica con sus criterios, subcriterios, columnas, observaciones y resultado
    res.json({ ...rubrica, criterios });
  } catch (error) {
    console.error('Error al obtener la rúbrica:', error);
    res.status(500).json({ message: 'Error al obtener la rúbrica' });
  }
});




// Ruta para obtener una rúbrica por su ID
app.get('/rubricas/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Obtener la rúbrica por ID
    const rubricaResult = await pool.query('SELECT * FROM Rubricas WHERE Rubrica_ID = $1', [id]);

    if (rubricaResult.rows.length === 0) {
      return res.status(404).json({ message: 'Rúbrica no encontrada' });
    }

    const rubrica = rubricaResult.rows[0];

    // Obtener los criterios de la rúbrica
    const criteriosResult = await pool.query('SELECT * FROM Criterios WHERE Rubrica_ID = $1', [id]);
    const criterios = criteriosResult.rows;

    
    for (const criterio of criteriosResult.rows) {
      const subcriteriosResult = await pool.query(
        'SELECT * FROM Subcriterios WHERE Criterio_ID = $1 ORDER BY Orden',
        [criterio.criterio_id]
      );
    
      criterio.subcriterios = subcriteriosResult.rows;
    
      // Paso 3: Consulta las Columnas para cada Subcriterio
      for (const subcriterio of subcriteriosResult.rows) {
        const columnasResult = await pool.query(
          'SELECT * FROM Columnas WHERE Subcriterio_ID = $1 ORDER BY Orden',
          [subcriterio.subcriterio_id]
        );
    
        subcriterio.columnas = columnasResult.rows; // Añade las columnas al subcriterio
      }
    }
    
    // Devolver la rúbrica con sus criterios, subcriterios y columnas
    res.json({ ...rubrica, criterios });
  } catch (error) {
    console.error('Error al obtener la rúbrica:', error);  // Esto imprimirá el error detalladamente
    res.status(500).json({ message: 'Error al obtener la rúbrica' });
  }
});

// Ruta para actualizar el estado de "publica" de una rúbrica
app.put('/rubricas/:id', async (req, res) => {
  const { id } = req.params; // Cambiar a 'id'
  const { publica } = req.body;

  try {
    // Actualizar el estado de "publica" en la base de datos
    const result = await pool.query(
      'UPDATE Rubricas SET Publica = $1 WHERE Rubrica_ID = $2 RETURNING *',
      [publica, id] // Cambiar a 'id'
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Rúbrica no encontrada.' });
    }

    res.json({ message: 'Estado de la rúbrica actualizado correctamente.', rubrica: result.rows[0] });
  } catch (error) {
    console.error('Error al actualizar el estado de la rúbrica:', error);
    res.status(500).json({ error: 'Error al actualizar el estado de la rúbrica.' });
  }
});



// Ruta para eliminar una rúbrica por su ID
app.delete('/rubricas/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Eliminar la rúbrica por ID
    const result = await pool.query('DELETE FROM Rubricas WHERE Rubrica_ID = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Rúbrica no encontrada' });
    }

    res.json({ message: `¡Se ha borrado la rúbrica exitosamente!` });
  } catch (error) {
    console.error('Error al eliminar la rúbrica:', error);
    res.status(500).json({ message: 'Error al eliminar la rúbrica' });
  }
});

// Ruta para registrar un nuevo usuario
app.post('/register', async (req, res) => {
  const { nombre, apellido, correo, contraseña } = req.body;

  try {
    // Verificar si el correo ya existe
    const existingUser = await pool.query('SELECT * FROM Usuarios WHERE Correo = $1', [correo]);
    
    if (existingUser.rows.length > 0) {
      // El correo ya existe, enviar mensaje de error
      return res.status(400).json({ error: 'El correo ya se encuentra asociado a una cuenta.' });
    }

    // Encriptar la contraseña antes de guardarla
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contraseña, salt);

    // Insertar el nuevo usuario
    const result = await pool.query(
      'INSERT INTO Usuarios (Nombre, Apellido, Correo, Contraseña) VALUES ($1, $2, $3, $4) RETURNING Usuario_ID',
      [nombre, apellido, correo, hashedPassword]
    );

    const userId = result.rows[0].usuario_id;

    // Asignar el rol de 'Consultor' por defecto (TipoUsuarioID = 1)
    await pool.query('INSERT INTO RolesAsignados (Usuario_ID, TipoUsuario_ID) VALUES ($1, 1)', [userId]);

    // Enviar respuesta de éxito
    res.status(201).json({ message: 'Usuario registrado exitosamente' });

  } catch (error) {
    console.error('Error en el servidor:', error);
    res.status(500).json({ error: 'Hubo un problema al registrar el usuario' });
  }
});

// Ruta para iniciar sesión
app.post('/login', async (req, res) => {
  const { correo, contraseña } = req.body;

  if (!correo || !contraseña) {
    return res.status(400).json({ error: 'Faltan datos obligatorios.' });
  }

  try {
    // 1. Buscar el usuario por correo
    const result = await pool.query('SELECT * FROM Usuarios WHERE Correo = $1', [correo]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas. Intente de nuevo.' });
    }

    const user = result.rows[0];

    // 2. Verificar la contraseña desencriptada usando bcrypt
    const validPassword = await bcrypt.compare(contraseña, user.contraseña);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales incorrectas. Intente de nuevo.' });
    }

    // 3. Si la contraseña es válida, iniciar sesión exitosamente
    res.status(200).json({ message: 'Inicio de sesión exitoso', usuarioId: user.usuario_id });
    
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ error: 'Hubo un error en el servidor.' });
  }
});

app.get('/roles/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const rolesResult = await pool.query(
      `SELECT tu.nombretipo 
       FROM RolesAsignados ra 
       JOIN TiposUsuario tu ON ra.tipousuario_id = tu.tipousuario_id 
       WHERE ra.usuario_id = $1`, 
      [userId]
    );

    const roles = rolesResult.rows.map(row => row.nombretipo);
    
    res.json(roles);
  } catch (error) {
    console.error('Error al obtener roles:', error);
    res.status(500).json({ message: 'Error al obtener roles' });
  }
});

app.delete('/delete_association/:asociacionId', async (req, res) => {
  const { asociacionId } = req.params;

  try {
    await pool.query('DELETE FROM AsignacionPropuestas WHERE Asignacion_ID = $1', [asociacionId]);
    res.status(200).json({ message: 'Propuesta eliminada con éxito' });
  } catch (error) {
    console.error('Error al eliminar la propuesta:', error);
    res.status(500).json({ message: 'Error al eliminar la propuesta' });
  }
});


app.put('/update_association_status/:asociacionId', async (req, res) => {
  const { asociacionId } = req.params;
  const { estado } = req.body;

  try {
    await pool.query('UPDATE AsignacionPropuestas SET EstadoPropuesta = $1 WHERE Asignacion_ID = $2', [estado, asociacionId]);
    res.status(200).json({ message: 'Estado de la propuesta actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar el estado de la propuesta:', error);
    res.status(500).json({ message: 'Error al actualizar el estado de la propuesta' });
  }
});





// Iniciar el servidor en el puerto 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
