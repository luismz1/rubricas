import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import './EvaluateRubric.css'; // Puedes personalizar el CSS si lo necesitas

function EvaluateRubric() {
  const { id } = useParams(); // Obtenemos el ID de la rúbrica desde la URL
  const [rubricData, setRubricData] = useState(null); // Estado para almacenar los datos de la rúbrica
  const [loading, setLoading] = useState(true); // Para manejar el estado de carga
  const [selectedOptions, setSelectedOptions] = useState({}); // Estado para almacenar la columna seleccionada por subcriterio
  const [confirmSubmit, setConfirmSubmit] = useState(false); // Estado para mostrar/ocultar el modal
  const [observaciones, setObservaciones] = useState(''); // Estado para almacenar las observaciones
  const location = useLocation();
  const roles = location.state?.roles || [];
  const userId = location.state?.userId;
  const asignacionId = location.state?.asignacionId;
  const navigate = useNavigate(); // Para redirigir a otras páginas

  useEffect(() => {
    // Función para obtener los datos de la API
    const fetchRubricData = async () => {
      try {
        const response = await fetch(`http://localhost:5000/rubricas/${id}`);
        const data = await response.json();
        setRubricData(data); // Almacenamos los datos en el estado
        setLoading(false); // Desactivamos el estado de carga
      } catch (error) {
        console.error('Error al obtener los datos:', error);
        setLoading(false); // Desactivamos el estado de carga incluso en caso de error
      }
    };

    fetchRubricData(); // Llamamos a la función cuando se monta el componente
  }, [id]);

  // Manejador de selección de columnas
  const handleOptionSelect = (subcriterioId, columnaIndex) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [subcriterioId]: columnaIndex, // Guardamos la columna seleccionada para cada subcriterio
    }));
  };

  // Validar si todas las casillas han sido seleccionadas
  const validateSelections = () => {
    let allSelected = true;
    rubricData.criterios.forEach((criterio) => {
      criterio.subcriterios.forEach((subcriterio) => {
        if (selectedOptions[subcriterio.subcriterio_id] === undefined) {
          allSelected = false; // Si no se seleccionó una casilla, retorna falso
        }
      });
    });
    return allSelected;
  };

  // Manejador para abrir el modal de confirmación
  const handleOpenConfirmModal = () => {
    if (!validateSelections()) {
      alert('Asegúrese de seleccionar una casilla por cada subcriterio.');
    } else {
      setConfirmSubmit(true); // Mostramos el modal si las selecciones son válidas
    }
  };

  // Manejador para cerrar el modal de confirmación
  const handleCloseConfirmModal = () => {
    setConfirmSubmit(false); // Ocultamos el modal
  };

  // Manejador para guardar la evaluación cuando se confirma en el modal
  const handleConfirmSave = () => {
    setConfirmSubmit(false); // Ocultamos el modal

    const resultados = [];

    rubricData.criterios.forEach((criterio, criterioIndex) => {
      criterio.subcriterios.forEach((subcriterio, subcriterioIndex) => {
        const selectedColumna = selectedOptions[subcriterio.subcriterio_id] !== undefined
          ? selectedOptions[subcriterio.subcriterio_id]
          : null;

        if (selectedColumna !== null) {
          const puntos_maximo = rubricData.cantidad_columnas - 1;

          // Calcular puntos obtenidos y porcentaje asignado
          const puntos_obtenidos = selectedColumna;
          const porcentaje_asignado = (subcriterio.porcentaje * (puntos_obtenidos / puntos_maximo));

          resultados.push({
            subcriterio_id: subcriterio.subcriterio_id,
            puntos_obtenidos,
            porcentaje_asignado,
            criterio_id: criterio.criterio_id,
          });
        }
      });
    });

    // Enviar los resultados al servidor junto con rubric_id, asignacionId y observaciones si hay
    const dataToSend = {
      rubric_id: id,
      asignacionId,
      resultados,
      observaciones: observaciones.trim()
    };

    fetch('http://localhost:5000/evaluar_rubrica', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataToSend),
    })
      .then((response) => {
        if (response.ok) {
          // Redirigir al mostrar rúbricas con el userId, roles y mensaje de éxito
          navigate('/rubrics/show_rubrics', { 
            state: { 
              successMessage: 'Se ha almacenado el resultado exitosamente.', 
              userId, 
              roles 
            } 
          });
        } else {
          throw new Error('Error al guardar la rúbrica');
        }
      })
      .catch((error) => {
        // Mostrar un mensaje de error con alerta
        alert('No se ha podido guardar el resultado');
        console.error('Error al guardar la evaluación:', error);
      });
  };

  if (loading) {
    return <div>Cargando...</div>; // Mostramos un indicador de carga mientras se obtienen los datos
  }

  if (!rubricData) {
    return <div>No se encontró la rúbrica.</div>; // Si no hay datos, mostramos un mensaje de error
  }

  return (
    <div className="evaluate-rubric-container">
      <h2>{rubricData.titulo || 'Sin título'}</h2>
      <p>{rubricData.descripcion || 'Sin descripción'}</p>

      {rubricData.criterios && rubricData.criterios.length > 0 ? (
        rubricData.criterios.map((criterio, criterioIndex) => (
          <div key={criterioIndex} className="criterion-container">
            <h3>{criterio.nombrecriterio || `Criterio ${criterioIndex + 1}`}</h3>
            <table className="rubric-table">
              <thead>
                <tr>
                  <th>Descripción</th>
                  {rubricData.cantidad_columnas > 0 &&
                    Array.from({ length: rubricData.cantidad_columnas }).map((_, index) => (
                      <th key={index}>{index} PTOS</th>
                    ))}
                  <th>Peso (%)</th>
                </tr>
              </thead>
              <tbody>
                {criterio.subcriterios && criterio.subcriterios.length > 0 ? (
                  criterio.subcriterios.map((subcriterio, subcriterioIndex) => (
                    <tr key={subcriterioIndex}>
                      <td>{subcriterio.descripcion || 'Sin descripción'}</td>
                      {subcriterio.columnas && subcriterio.columnas.length > 0 ? (
                        subcriterio.columnas.map((columna, columnaIndex) => (
                          <td
                            key={columnaIndex}
                            className={`selectable-cell ${
                              selectedOptions[subcriterio.subcriterio_id] === columnaIndex ? 'selected' : ''
                            }`}
                            onClick={() => handleOptionSelect(subcriterio.subcriterio_id, columnaIndex)}
                          >
                            {columna.textocolumna} {/* Aquí mostramos el texto correcto de la columna */}
                          </td>
                        ))
                      ) : (
                        <td colSpan={rubricData.cantidad_columnas}>No hay columnas definidas</td>
                      )}
                      <td>{subcriterio.porcentaje || 0}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={rubricData.cantidad_columnas + 1}>No hay subcriterios definidos</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))
      ) : (
        <p>No hay criterios disponibles.</p>
      )}

      {/* Campo para observaciones dentro de un recuadro */}
      <div className="criterion-container">
        <h3>Observaciones</h3>
        <textarea
          id="observaciones"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Inserte las observaciones que vea necesarias."
          style={{ width: '100%', height: '150px', resize: 'none', padding: '10px' }} // Tamaño fijo y estilo básico
        />
      </div>

      {/* Botón para abrir el modal de confirmación */}
      <button className="submit-button" onClick={handleOpenConfirmModal}>
        Guardar
      </button>

      {/* Modal de confirmación */}
      {confirmSubmit && (
        <div className="modal-overlay">
            <div className="modal-content">
              <p style={{ fontWeight: 'bold', textAlign: 'center' }}>
                  ¿Está seguro de enviar el resultado de esta propuesta?
              </p>
              <p style={{textAlign: 'center', marginTop: '10px' }}>
                  Advertencia: Este resultado es irreversible
              </p>
              <div className="confirmation-buttons">
                  <button className="confirm-yes" onClick={handleConfirmSave}>Sí</button>
                  <button className="confirm-no" onClick={handleCloseConfirmModal}>No</button>
              </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default EvaluateRubric;
