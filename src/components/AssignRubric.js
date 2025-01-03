import React, { useState, useEffect } from 'react'; 
import { useLocation } from 'react-router-dom';
import Header from './header';
import Navbar from './Navbar';
import './AssignRubric.css'; 
import loadingGif from './loading_image.gif';

function AssignRubric() {
  const location = useLocation();
  const roles = location.state?.roles || [];
  const userId = location.state?.userId;

  const [rubricas, setRubricas] = useState([]);
  const [propuestas, setPropuestas] = useState([]);
  const [selectedRubrica, setSelectedRubrica] = useState(null);
  const [selectedPropuesta, setSelectedPropuesta] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:5000/rubricas').then(response => response.json()),
      fetch('http://localhost:5000/propuestas').then(response => response.json())
    ])
    .then(([rubricasData, propuestasData]) => {
      setRubricas(rubricasData);
      setPropuestas(propuestasData);
      setLoading(false);
    })
    .catch(error => {
      console.error('Error al cargar los datos:', error);
      setLoading(false);
    });
  }, []);

  const handleSave = () => {
    if (!selectedRubrica || !selectedPropuesta) {
      setErrorMessage('Debe seleccionar una rúbrica y una propuesta');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }

    const tipoPropuesta = selectedPropuesta.tipo_solicitud_origen;

    if (!tipoPropuesta) {
      setErrorMessage('Debe seleccionar un tipo de propuesta');
      return;
    }

    fetch('http://localhost:5000/rubricapropuesta', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rubrica_id: selectedRubrica.rubrica_id,
        propuesta_id: selectedPropuesta.id_solicitud,
        tipo_propuesta: tipoPropuesta
      })
    })
    .then(response => {
      if (response.status === 409) {
        setErrorMessage('Esta rúbrica ya se encuentra asociada a este tipo de propuesta');
        setTimeout(() => setErrorMessage(''), 5000);
      } else if (response.ok) {
        setSuccessMessage('Se ha guardado exitosamente');
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setErrorMessage('Hubo un error al guardar la asignación');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    })
    .catch(error => {
      setErrorMessage('Error de conexión con el servidor');
      setTimeout(() => setErrorMessage(''), 5000);
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
            <h1>Asignación de Rúbricas</h1>
            <div className="selection-container">
              <h3>Seleccione una Rúbrica</h3>
              <div className="scrollable-list">
                {rubricas.length > 0 ? (
                  rubricas.map((rubrica) => (
                    <label key={rubrica.rubrica_id} className="radio-label">
                      <input
                        type="radio"
                        name="rubrica"
                        value={rubrica.rubrica_id}
                        defaultChecked={selectedRubrica?.rubrica_id === rubrica.rubrica_id}
                        onClick={() => setSelectedRubrica(rubrica)}
                      />
                      {rubrica.titulo}
                    </label>
                  ))
                ) : (
                  <p>No se han encontrado rúbricas de momento.</p>
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

export default AssignRubric;
