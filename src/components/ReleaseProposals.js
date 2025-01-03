import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './header';
import Navbar from './Navbar';
import './ReleaseProposals.css';
import { FaPaperPlane, FaTrash } from 'react-icons/fa';
import loadingGif from './loading_image.gif';

function ReleaseProposals() {
  const [associations, setAssociations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRubric, setSelectedRubric] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [asociacionId, setAsociacionId] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false); // Estado para el mensaje de confirmación de borrar
  const [successMessage, setSuccessMessage] = useState(''); // Estado para manejar el mensaje de éxito

  const location = useLocation();
  const roles = location.state?.roles || [];
  const adminId = location.state?.userId;

  useEffect(() => {
    const fetchAssociations = async () => {
      try {
        const response = await fetch('http://localhost:5000/get_associations');
        const data = await response.json();
        setAssociations(data);
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar las asociaciones:', error);
        setLoading(false);
      }
    };

    fetchAssociations();
  }, []);

  const handleLiberarPropuesta = async (asociacionId) => {
    try {
      const response = await fetch(`http://localhost:5000/get_reconstructed_rubric/${asociacionId}`);
      const rubricData = await response.json();
      
      console.log(asociacionId);
      console.log(rubricData);
      // Marcamos las columnas seleccionadas correctamente
      rubricData.criterios.forEach((criterio) => {
        criterio.subcriterios.forEach((subcriterio) => {
          subcriterio.columnas = subcriterio.columnas.map((columna) => ({
            ...columna,
            selected: columna.orden === subcriterio.puntosobtenidos,  // Marcamos la columna seleccionada según los puntos obtenidos
          }));
        });
      });
      
      setSelectedRubric(rubricData);
      setAsociacionId(asociacionId);
    } catch (error) {
      console.error('Error al obtener la rúbrica evaluada:', error);
    }
  };

  const handleLiberarClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmLiberation = async () => {
    try {
      await fetch(`http://localhost:5000/update_association_status/${asociacionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estado: 3 }),
      });

      setAssociations((prevAssociations) =>
        prevAssociations.map((association) =>
          association.asociacion_id === asociacionId
            ? { ...association, estado: 'Liberada' }
            : association
        )
      );

      const proposalUrl = `http://localhost:5000/get_reconstructed_rubric/${asociacionId}`; // Enlace al JSON reconstruido

      setShowConfirmation(false);
      setSelectedRubric(null);
      setAsociacionId(null);

      // Mostrar mensaje de éxito con el enlace al JSON reconstruido
      setSuccessMessage(`Se ha liberado la propuesta: ${proposalUrl}`);
      setTimeout(() => setSuccessMessage(''), 10000); // Ocultar el mensaje después de 10 segundos
    } catch (error) {
      console.error('Error al liberar la propuesta:', error);
    }
  };

  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
  };

  const handleCancelRubric = () => {
    setSelectedRubric(null);
  };

  // Manejador para mostrar confirmación de borrado
  const handleDeleteProposal = (asociacionId) => {
    setAsociacionId(asociacionId);
    setDeleteConfirmation(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await fetch(`http://localhost:5000/delete_association/${asociacionId}`, {
        method: 'DELETE',
      });
  
      if (response.ok) {
        setAssociations((prevAssociations) =>
          prevAssociations.filter((association) => association.asociacion_id !== asociacionId)
        );
      } else {
        console.error('Error al intentar eliminar la propuesta.');
      }
  
      setDeleteConfirmation(false);
      setAsociacionId(null);
    } catch (error) {
      console.error('Error al borrar la propuesta:', error);
    }
  };
  

  const handleCloseDeleteConfirmation = () => {
    setDeleteConfirmation(false);
  };

  return (
    <div className="release-proposals-wrapper">
      <Header highlightedPage="Rúbricas" />
      <Navbar roles={roles} userId={adminId} />

      {/* Mostrar el mensaje de éxito si existe */}
      {successMessage && (
        <div className="success-message-home">
          {successMessage}
        </div>
      )}

      <div className="rubrics-container">
        <h1>Liberación de Propuestas</h1>
        {loading ? (
          <div className="loading-message">
            <p>Cargando información, espere un momento por favor...</p>
            <img src={loadingGif} alt="Cargando" className="loading-gif" />
          </div>
        ) : associations.length > 0 ? (
          <table className="associations-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {associations.map((association) => (
                <tr key={association.asociacion_id}>
                  <td>{association.nombre_rubrica}</td>
                  <td>{association.tipo}</td>
                  <td>{new Date(association.fecha).toLocaleDateString()}</td>
                  <td>{association.estado}</td>
                  <td>
                    <FaPaperPlane
                      className={`icon-action ${association.estado === 'Evaluada' ? 'clickable' : 'disabled'}`}
                      title="Liberar Propuesta"
                      onClick={() => association.estado === 'Evaluada' && handleLiberarPropuesta(association.asociacion_id)}
                    />
                    <FaTrash
                      className={`icon-action ${association.estado === 'Liberada' ? 'clickable' : 'disabled'}`}
                      title="Borrar Propuesta"
                      onClick={() => association.estado === 'Liberada' && handleDeleteProposal(association.asociacion_id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No hay asociaciones para mostrar.</p>
        )}
      </div>

      {selectedRubric && !showConfirmation && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{selectedRubric.titulo || 'Sin título'}</h2>
            <p>{selectedRubric.descripcion || 'Sin descripción'}</p>
            <p>Nota Obtenida: {selectedRubric.resultado || 'No disponible'}</p>

            {selectedRubric.criterios && selectedRubric.criterios.length > 0 ? (
              selectedRubric.criterios.map((criterio, index) => (
                <div key={index} className="criterio-container">
                  <h3>{criterio.nombrecriterio || 'Criterio sin nombre'} - {criterio.porcentajeasignado}%</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Descripción</th>
                        {criterio.subcriterios[0]?.columnas.map((columna, colIndex) => (
                          <th key={colIndex}>{columna.orden} PTOS</th>
                        ))}
                        <th>Porcentaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {criterio.subcriterios.map((subcriterio, subIndex) => (
                        <tr key={subIndex}>
                          <td>{subcriterio.descripcion}</td>
                          {subcriterio.columnas.map((columna, colIndex) => (
                            <td key={colIndex} className={columna.selected ? 'highlighted' : ''}>
                                {columna.textocolumna !== null && columna.textocolumna !== undefined
                                  ? columna.textocolumna
                                  : `${columna.orden} PTOS`}
                              </td>
                          ))}
                          <td>{subcriterio.porcentaje}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            ) : (
              <p>No hay criterios</p>
            )}

            <p>Observaciones: {selectedRubric.observaciones || 'No hay observaciones'}</p>

            <div className="button-group">
              <button onClick={handleLiberarClick}>Liberar</button>
              <button onClick={handleCancelRubric}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmation && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>¿Está seguro de liberar el resultado de esta propuesta?</h2>
            <p>Advertencia: Esta decisión es irreversible.</p>
            <div className="confirmation-buttons">
              <button className="confirm-yes" onClick={handleConfirmLiberation}>Sí</button>
              <button className="confirm-no" onClick={handleCloseConfirmation}>No</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmation && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>¿Está seguro de borrar esta asignación de propuesta?</h2>
            <p>Advertencia: Esta decisión es irreversible.</p>
            <div className="confirmation-buttons">
              <button className="confirm-yes" onClick={handleConfirmDelete}>Sí</button>
              <button className="confirm-no" onClick={handleCloseDeleteConfirmation}>No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReleaseProposals;
