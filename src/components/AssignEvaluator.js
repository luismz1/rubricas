import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './header';
import Navbar from './Navbar';
import './AssignRubric.css'; // Utilizando el mismo estilo de CSS que AssignRubric
import loadingGif from './loading_image.gif';

function AssignEvaluator() {
  const location = useLocation();
  const roles = location.state?.roles || [];
  const userId = location.state?.userId;

  const [evaluadores, setEvaluadores] = useState([]); // Para los evaluadores
  const [propuestas, setPropuestas] = useState([]);
  const [selectedEvaluador, setSelectedEvaluador] = useState(null);
  const [selectedPropuesta, setSelectedPropuesta] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true); // Estado de cargando

  useEffect(() => {
    // Fetch de evaluadores y propuestas
    Promise.all([
      fetch('http://localhost:5000/evaluadores').then(response => response.json()),
      fetch('http://localhost:5000/propuestas').then(response => response.json())
    ])
    .then(([evaluadoresData, propuestasData]) => {
      console.log('Evaluadores:', evaluadoresData); // Para verificar si llegan los datos
      console.log('Propuestas:', propuestasData);    // Para verificar si llegan las propuestas
      setEvaluadores(evaluadoresData);
      setPropuestas(propuestasData);
      setLoading(false);
    })
    .catch(error => {
      console.error('Error al cargar los datos:', error);
      setLoading(false);
    });
  }, []);

  const handleSave = () => {
    console.log('Evaluador seleccionado:', selectedEvaluador);
    console.log('Propuesta seleccionada:', selectedPropuesta);

    if (!selectedEvaluador || !selectedPropuesta) {
      setErrorMessage('Debe seleccionar un evaluador y una propuesta');
      setTimeout(() => setErrorMessage(''), 5000); // Limpiar mensaje de error
      return;
    }

    const tipoPropuesta = selectedPropuesta.tipo_solicitud_origen;
  
    if (!tipoPropuesta) {
      setErrorMessage('Debe seleccionar un tipo de propuesta');
      return;
    }

    // Guardar asignación de evaluador
    fetch('http://localhost:5000/evaluadorpropuesta', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        evaluador_id: selectedEvaluador.usuario_id,
        propuesta_id: selectedPropuesta.id_solicitud,
        tipo_propuesta: tipoPropuesta
      })
    })
    .then(response => {
      if (response.status === 409) {
        setErrorMessage('Este evaluador ya está asignado a esta propuesta');
        setTimeout(() => setErrorMessage(''), 5000); // Limpiar mensaje de error
      } else if (response.ok) {
        setSuccessMessage('Se ha guardado exitosamente');
        setTimeout(() => setSuccessMessage(''), 5000); // Limpiar mensaje de éxito
      } else {
        setErrorMessage('Hubo un error al guardar la asignación');
        setTimeout(() => setErrorMessage(''), 5000); // Limpiar mensaje de error
      }
    })
    .catch(error => {
      setErrorMessage('Error de conexión con el servidor');
      setTimeout(() => setErrorMessage(''), 5000); // Limpiar mensaje de error
    });
  };

  return (
    <div>
      <Header highlightedPage="Rúbricas" />
      <Navbar roles={roles} userId={userId} />
      <div className="assign-rubric-container">
        {loading ? (
          <div className="loading-message">
            <p>Cargando información, espere un momento por favor...</p>
            <img src={loadingGif} alt="Cargando" className="loading-gif" />
          </div>
        ) : (
          <>
            {successMessage && <div className="success-message">{successMessage}</div>}
            {errorMessage && <div className="warning-message">{errorMessage}</div>}
            <h1>Asignación de Evaluadores</h1>
            <div className="selection-container">
              <h3>Seleccione un Evaluador</h3>
              <div className="scrollable-list">
                {evaluadores.length > 0 ? (
                  evaluadores.map((evaluador) => (
                    <label key={evaluador.usuario_id} className="radio-label">
                      <input
                        type="radio"
                        name="evaluador"
                        value={evaluador.usuario_id}
                        defaultChecked={selectedEvaluador?.usuario_id === evaluador.usuario_id} 
                        onClick={() => setSelectedEvaluador(evaluador)}
                      />
                      {evaluador.nombre}
                    </label>
                  ))
                ) : (
                  <p>No se han encontrado evaluadores de momento.</p>
                )}
              </div>
            </div>

            <div className="selection-container">
              <h3>Seleccione una Propuesta</h3>
              <div className="scrollable-list">
                {propuestas.length > 0 ? (
                  propuestas.map((propuesta) => (
                    <label key={propuesta.id_solicitud} className="radio-label">
                      <input
                        type="radio"
                        name="propuesta"
                        value={propuesta.id_solicitud}
                        defaultChecked={selectedPropuesta?.id_solicitud === propuesta.id_solicitud}
                        onClick={() => setSelectedPropuesta(propuesta)}
                      />
                      {propuesta.descripcion}
                    </label>
                  ))
                ) : (
                  <p>No se han encontrado propuestas de momento.</p>
                )}
              </div>
            </div>

            <button onClick={handleSave} className="save-button">Guardar</button>
          </>
        )}
      </div>
    </div>
  );
}

export default AssignEvaluator;
