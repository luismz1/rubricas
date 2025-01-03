import React, { useEffect, useState } from 'react';
import './ShowCreatedRubrics.css';
import Header from './header';
import Navbar from './Navbar';
import { FaSearch, FaPen, FaTrash } from 'react-icons/fa';
import { useLocation, useNavigate  } from 'react-router-dom';
import loadingGif from './loading_image.gif'; 

function ShowCreatedRubrics() {
  const location = useLocation();
  const navigate = useNavigate(); // Inicializa useNavigate
  const roles = location.state?.roles || [];
  const creadorId = location.state?.userId;
  const [rubrics, setRubrics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreatedRubricDetails, setShowCreatedRubricDetails] = useState(false);
  const [rubricDetails, setRubricDetails] = useState(null);
  const [successMessage, setSuccessMessage] = useState(''); // Estado para el mensaje de éxito
  const [confirmDelete, setConfirmDelete] = useState(null); // Estado para la confirmación de borrado

  useEffect(() => {
    const fetchRubrics = async () => {
      try {
        const response = await fetch(`http://localhost:5000/rubricas/creadas/${creadorId}`);
        const data = await response.json();
        setRubrics(data);
      } catch (error) {
        console.error('Error al cargar las rúbricas creadas:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRubrics();
  }, [creadorId]);

  const handleMagicSearch = async (rubric) => {
    try {
      const response = await fetch(`http://localhost:5000/rubricas/${rubric.rubrica_id}`);
      const data = await response.json();
      setRubricDetails(data);
      setShowCreatedRubricDetails(true);
    } catch (error) {
      console.error('Error al obtener la rúbrica:', error);
    }
  };

  const handleEdit = (rubric) => {
    navigate(`/rubrics/modify/${rubric.rubrica_id}`, {
      state: {
        roles: roles,
        userId: creadorId,
      },
    });
  };

  const handleDelete = (rubric) => {
    setConfirmDelete(rubric); // Mostrar confirmación de eliminación
  };

  const confirmDeleteRubric = async () => {
    if (!confirmDelete) return;

    try {
      const response = await fetch(`http://localhost:5000/rubricas/${confirmDelete.rubrica_id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        setRubrics(rubrics.filter(r => r.rubrica_id !== confirmDelete.rubrica_id)); // Actualizar la lista
        setSuccessMessage(data.message); // Mostrar el mensaje de éxito
        setTimeout(() => setSuccessMessage(''), 3000); // Limpiar el mensaje después de 3 segundos
      } else {
        console.error('Error al eliminar la rúbrica');
      }
    } catch (error) {
      console.error('Error al eliminar la rúbrica:', error);
    } finally {
      setConfirmDelete(null); // Cerrar la confirmación
    }
  };

  const handleCloseModal = () => {
    setShowCreatedRubricDetails(false);
    setRubricDetails(null);
  };

  return (
    <div className="show-rubrics-wrapper">
      <Header highlightedPage="Rúbricas" />
      <Navbar roles={roles} userId={creadorId} />
      {successMessage && <div className="success-message-home">{successMessage}</div>} {/* Mensaje de éxito */}
      <div className="rubrics-container">
        <h1>Rúbricas Creadas</h1>
        {isLoading ? (
          <div className="loading-message">
            <p>Cargando información, espere un momento por favor...</p>
            <img src={loadingGif} alt="Cargando" className="loading-gif" />
          </div>
        ) : rubrics.length > 0 ? (
          rubrics.map((rubric, index) => (
            <div key={index} className="rubric-item">
              <div className="rubric-info">
                <div className="rubric-title">{rubric.titulo}</div>
                <div className="rubric-author">Autor: {rubric.autor}</div>
              </div>
              <div className="rubric-icons">
                <FaSearch className="icon" onClick={() => handleMagicSearch(rubric)} />
                <FaPen className="icon" onClick={() => handleEdit(rubric)} />
                <FaTrash className="icon" onClick={() => handleDelete(rubric)} />
              </div>
            </div>
          ))
        ) : (
          <p>No hay rúbricas creadas disponibles.</p>
        )}
      </div>

      {confirmDelete && (
        <div className="modal-overlay">
            <div className="modal-content">
            <p style={{ fontWeight: 'bold', textAlign: 'center' }}>
                ¿Está seguro de borrar esta rúbrica: {confirmDelete.titulo}?
            </p>
            <p style={{textAlign: 'center', marginTop: '10px' }}>
                Advertencia: Esta acción es irreversible
            </p>
            <div className="confirmation-buttons">
                <button className="confirm-yes" onClick={confirmDeleteRubric}>Sí</button>
                <button className="confirm-no" onClick={() => setConfirmDelete(null)}>No</button>
            </div>
            </div>
        </div>
        )}




      {showCreatedRubricDetails && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{rubricDetails.titulo}</h2>
            <p>{rubricDetails.descripcion}</p>
            {rubricDetails.criterios && rubricDetails.criterios.map((criterio, index) => (
              <div key={index} className="criterio-container">
                <h3>{criterio.nombrecriterio}</h3>
                <table className="rubric-table">
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      {criterio.subcriterios[0]?.columnas.map((columna, colIndex) => (
                        <th key={colIndex}>{colIndex} PTOS</th>
                      ))}
                      <th>Porcentaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criterio.subcriterios.map((subcriterio, subIndex) => (
                      <tr key={subIndex}>
                        <td>{subcriterio.descripcion}</td>
                        {subcriterio.columnas.map((columna, colIndex) => (
                          <td key={colIndex}>{columna.textocolumna}</td>
                        ))}
                        <td>{subcriterio.porcentaje}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            <button onClick={handleCloseModal}>Aceptar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShowCreatedRubrics;
