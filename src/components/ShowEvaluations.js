import React, { useState, useEffect } from 'react';
import Header from './header';
import Navbar from './Navbar';
import './ShowRubrics.css'; // Usa el CSS actualizado
import loadingGif from './loading_image.gif';
import { FaRegEdit } from 'react-icons/fa'; // Importa el ícono de notas con lápiz cruzado
import { useLocation, useNavigate } from 'react-router-dom'; // Importa useNavigate

function ShowEvaluation() {
  const location = useLocation();
  const navigate = useNavigate(); // Inicializa useNavigate
  const roles = location.state?.roles || [];
  const userId = location.state?.userId;

  const [propuestas, setPropuestas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchPropuestas = async () => {
      try {
        const response = await fetch(`http://localhost:5000/evaluador/${userId}/propuestas-evaluacion`);
        const data = await response.json();
        
        if (response.status === 404) {
          setErrorMessage(data.message);
        } else {
          setPropuestas(data);
        }

      } catch (error) {
        console.error('Error al cargar las propuestas por evaluar:', error);
        setErrorMessage('Error al cargar las propuestas');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPropuestas();
  }, [userId]);

  // Función para manejar la redirección
  const handleEdit = (rubricaId, asignacionId) => {
    navigate(`/rubrics/evaluate/${rubricaId}`, {
      state: {
        roles: roles,
        userId: userId,
        asignacionId: asignacionId
      },
    });
  };

  return (
    <div className="show-rubrics-wrapper">
      <Header highlightedPage="Rúbricas" />
      <Navbar roles={roles} userId={userId} />
      <div className="rubrics-container">
        <h1>Evaluar Propuestas</h1>
        {isLoading ? (
          <div className="loading-message">
            <p>Cargando propuestas, espere un momento por favor...</p>
            <img src={loadingGif} alt="Cargando..." className="loading-gif" />
          </div>
        ) : errorMessage ? (
          <div className="no-data-message">
            <p>{errorMessage}</p>
          </div>
        ) : (
          propuestas.length > 0 ? (
            propuestas.map((propuesta, index) => (
              <div key={index} className="rubric-item">
                <div className="rubric-info">
                  <div className="rubric-title">{propuesta.descripcion}</div>
                  <div className="rubric-author">Rúbrica: {propuesta.rubrica_titulo}</div>
                </div>
                <div className="rubric-icon" onClick={() => handleEdit(propuesta.rubrica_id, propuesta.asignacion_id)}>
                  <FaRegEdit /> {/* Ícono de notas con lápiz cruzado */}
                </div>
              </div>
            ))
          ) : (
            <p>No hay propuestas asignadas disponibles.</p>
          )
        )}
      </div>
    </div>
  );
}

export default ShowEvaluation;
