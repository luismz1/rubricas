import React, { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import './ModifyRubric.css';
import './CreateRubric.css';
import Header from './header';
import Navbar from './Navbar';
import { FaPen, FaTrash } from 'react-icons/fa';

function ModifyRubric() {
  const location = useLocation();
  const roles = location.state?.roles || [];
  const creadorId = location.state?.userId;
  const { id } = useParams();
  const [formData, setFormData] = useState(null);
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const [activeTab, setActiveTab] = useState('info-general');
  const [isEditingCriterion, setIsEditingCriterion] = useState(false);
  const [currentEditingCriterion, setCurrentEditingCriterion] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [criterioToDelete, setCriterioToDelete] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchRubric = async () => {
      try {
        const response = await fetch(`http://localhost:5000/rubricas/${id}`);
        const data = await response.json();
        if (data.fechacreacion) {
          data.fechacreacion = new Date(data.fechacreacion).toISOString().split('T')[0];
        }
        setFormData(data);
      } catch (error) {
        console.error('Error al cargar la rúbrica:', error);
      }
    };
    fetchRubric();
  }, [id]);

  useEffect(() => {
    if (formData) {
      const allFieldsFilled = ['autor', 'titulo', 'descripcion', 'areageneral', 'areaespecifica', 'aspectoevaluar']
        .every(field => formData[field] && formData[field].trim() !== '');
      const isDateValid = formData.fechacreacion && formData.fechacreacion !== '';
      setIsButtonDisabled(!(allFieldsFilled && isDateValid));
    }
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleEditCriterion = (criterioIndex) => {
    setCurrentEditingCriterion(criterioIndex);
    setIsEditingCriterion(true);
  };

  const handleReturnFromEdit = () => {
    setIsEditingCriterion(false);
  };

  const handleCriterionChange = (fieldPath, value) => {
    const updatedFormData = { ...formData }; // Copiamos el estado actual
    const fieldPathParts = fieldPath.split('.'); // Descomponemos el path de la clave en partes
  
    // Iteramos sobre las partes del path para llegar al valor correcto a modificar
    let target = updatedFormData.criterios[currentEditingCriterion];
    for (let i = 0; i < fieldPathParts.length - 1; i++) {
      target = target[fieldPathParts[i]]; // Navegamos en la estructura de los subcriterios/columnas
    }
    
    // Actualizamos el valor en el último nivel del path
    target[fieldPathParts[fieldPathParts.length - 1]] = value;
  
    // Finalmente, actualizamos el estado
    setFormData(updatedFormData);
  };

  const handleDeleteClick = (criterioIndex) => {
    setCriterioToDelete(criterioIndex);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    const updatedFormData = { ...formData };
  
    // Eliminamos el criterio según el índice guardado en criterioToDelete
    updatedFormData.criterios.splice(criterioToDelete, 1);
  
    // Reorganizamos los números de los criterios para que no haya huecos
    updatedFormData.criterios = updatedFormData.criterios.map((criterio, index) => ({
      ...criterio,
      orden: index  // Actualizamos el índice de cada criterio para que sea consecutivo
    }));
  
    setFormData(updatedFormData);
    setIsDeleteModalOpen(false); // Cerramos el modal de confirmación
  };
  

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
  };

  const handleAddCriterion = () => {
    const newCriterio = {
      subcriterios: []
    };
  
    // Actualiza el estado con el nuevo criterio
    setFormData(prevData => ({
      ...prevData,
      criterios: [...prevData.criterios, newCriterio],
    }));
  };

// Función de validación
const validateRubric = () => {
  let valid = true;
  let errorMessage = '';
  let totalPorcentajeGeneral = 0; // Variable para almacenar la suma de todos los porcentajes

  // Verificar que todos los criterios, subcriterios y columnas tengan texto
  for (let criterio of formData.criterios) {
    if (!criterio.nombrecriterio.trim()) {
      valid = false;
      errorMessage = 'Todos los criterios deben tener texto.';
      break;
    }

    for (let subcriterio of criterio.subcriterios) {
      if (!subcriterio.descripcion.trim()) {
        valid = false;
        errorMessage = 'Todos los subcriterios deben tener texto.';
        break;
      }

      for (let columna of subcriterio.columnas) {
        if (!columna.textocolumna.trim()) {
          valid = false;
          errorMessage = 'Todas las columnas deben tener texto.';
          break;
        }
      }

      // Sumar el porcentaje de cada subcriterio
      const porcentaje = parseFloat(subcriterio.porcentaje);
      console.log(`Porcentaje de subcriterio en criterio ${criterio.nombrecriterio}: ${porcentaje}`); // Depurar cada porcentaje
      totalPorcentajeGeneral += isNaN(porcentaje) ? 0 : porcentaje; // Asegurarse de que no se sumen valores NaN
    }
  }

  console.log(`Suma total de los porcentajes de todos los subcriterios es: ${totalPorcentajeGeneral}`);

  // Verificar que la suma total de los porcentajes de todos los subcriterios sea 100%
  if (totalPorcentajeGeneral !== 100) {
    valid = false;
    errorMessage = 'La suma de los porcentajes de todos los subcriterios debe ser 100%.';
  }

  if (!valid) {
    setErrorMessage(errorMessage);  // Muestra el error en pantalla

    // Después de 5 segundos, se oculta el mensaje
    setTimeout(() => {
      setErrorMessage('');
    }, 5000); // 5000ms = 5 segundos
  }

  return valid;
};

const handleSaveChanges = async () => {
  if (!validateRubric()) {
    return;
  }

  try {
    // Actualizar el orden de los criterios
    formData.criterios = formData.criterios.map((criterio, index) => ({
      ...criterio,
      orden: index,
      subcriterios: criterio.subcriterios.map(subcriterio => ({
        ...subcriterio,
        columnas: subcriterio.columnas.map((columna, colIndex) => ({
          ...columna,
          orden: colIndex, // Asigna correctamente el "orden" a las columnas
        }))
      }))
    }));

    const rubricaData = {
      ...formData,
      criterios: formData.criterios,
    };

    const response = await fetch(`http://localhost:5000/rubricas/actualizar/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rubricaData),
    });

    if (response.ok) {
      setSuccessMessage('Cambios guardados correctamente.');
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } else {
      setErrorMessage('Hubo un error al guardar los cambios.');
      setTimeout(() => {
        setErrorMessage('');
      }, 5000);
    }
  } catch (error) {
    setErrorMessage('Error en la conexión con el servidor.');
    setTimeout(() => {
      setErrorMessage('');
    }, 5000);
  }
};




  const addSubcriterion = () => {
    const updatedFormData = { ...formData };
    const newSubcriterion = {
      descripcion: '',
      columnas: Array.from({ length: formData.cantidad_columnas }).map(() => ({ textocolumna: '' })),
      porcentaje: 0,
    };
    updatedFormData.criterios[currentEditingCriterion].subcriterios.push(newSubcriterion);
    setFormData(updatedFormData);
  };

  const removeSubcriterion = (subIndex) => {
    const updatedFormData = { ...formData };
    updatedFormData.criterios[currentEditingCriterion].subcriterios.splice(subIndex, 1);
    setFormData(updatedFormData);
  };

  if (!formData) {
    return <div>Cargando...</div>;
  }
  console.log(formData)
  return (
    <div className="modify-rubric-wrapper">
      <Header highlightedPage="Rúbricas" />
      <Navbar roles={roles} userId={creadorId} />

      <div className="mini-navbar-horizontal">
        <div
          className={`mini-navbar-item-horizontal ${activeTab === 'info-general' ? 'active' : ''}`}
          onClick={() => handleTabChange('info-general')}
        >
          Información General
        </div>
        <div
          className={`mini-navbar-item-horizontal ${activeTab === 'matriz' ? 'active' : ''}`}
          onClick={() => handleTabChange('matriz')}
        >
          Matriz
        </div>
      </div>

    {/* Mostrar mensaje de advertencia si hay un error */}
    {errorMessage && (
      <div className="warning-message">
        {errorMessage}
      </div>
    )}

    {/* Mostrar mensaje de éxito si la operación fue exitosa */}
    {successMessage && (
      <div className="success-message">
        {successMessage}
      </div>
    )}

      {activeTab === 'info-general' && (
        <div className="create-rubric-container">
          <form className="rubric-form">
            <div className="form-group">
              <label>Autor:</label>
              <input
                type="text"
                name="autor"
                value={formData.autor}
                onChange={handleChange}
                placeholder="Ingresa el nombre del autor"
              />
            </div>
            <div className="form-group">
              <label>Fecha:</label>
              <input
                type="date"
                name="fechacreacion"
                value={formData.fechacreacion}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]} // Establece la fecha máxima a hoy
              />
            </div>
            <div className="form-group">
              <label>Título:</label>
              <input
                type="text"
                name="titulo"
                value={formData.titulo}
                onChange={handleChange}
                placeholder="Ingresa el título"
              />
            </div>
            <div className="form-group">
              <label>Descripción:</label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                placeholder="Ingresa una descripción"
              ></textarea>
            </div>
            <div className="form-group">
              <label>Área General:</label>
              <select
                name="areageneral"
                value= {formData.areageneral}
                onChange={handleChange}
              >
                <option value="VIE">VIE</option>
                <option value="FDU">FDU</option>
              </select>
            </div>
            <div className="form-group">
              <label>Área Específica:</label>
              <input
                type="text"
                name="areaespecifica"
                value={formData.areaespecifica}
                onChange={handleChange}
                placeholder="Ingresa el area específica"
              />
            </div>
            <div className="form-group">
              <label>Aspecto a Evaluar:</label>
              <input
                type="text"
                name="aspectoevaluar"
                value={formData.aspectoevaluar}
                onChange={handleChange}
                placeholder="Ingresa el aspecto a evaluar"
              />
            </div>
          </form>

          <button
            type="button"
            onClick={handleSaveChanges}
            className={`next-button ${isButtonDisabled ? 'disabled' : ''}`}
            disabled={isButtonDisabled}
          >
            Guardar Cambios
          </button>
        </div>
      )}

      {activeTab === 'matriz' && !isEditingCriterion && (
        <div className="matrix-container">
          <h2>Matriz de Evaluación</h2>

          {formData.criterios?.map((criterio, criterioIndex) => (
            <div key={criterioIndex} className="criterio-item">
              <div className="criterio-header">
                <h3>Criterio {criterioIndex + 1}: {criterio.nombrecriterio}</h3>
                <div className="criterio-icons">
                  <FaPen className="edit-icon" onClick={() => handleEditCriterion(criterioIndex)} />
                  <FaTrash className="delete-icon" onClick={() => handleDeleteClick(criterioIndex)} />
                </div>
              </div>
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

          <div className="modify-buttons">
            <button className="modify-button" onClick={handleAddCriterion}>Agregar Criterio</button>
            <button className="modify-button" onClick={handleSaveChanges}>Guardar Cambios</button>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="modal-backdrop">
          <div className="delete-modal">
            <p style={{ fontWeight: 'bold', textAlign: 'center' }}>
              ¿Estás seguro de que deseas borrar este criterio?
            </p>
            <div className="confirmation-buttons">
              <button className="confirm-yes" onClick={handleConfirmDelete}>Sí</button>
              <button className="confirm-no" onClick={handleCancelDelete}>No</button>
            </div>
          </div>
        </div>
      )}

      {isEditingCriterion && (
        <>
          <div className="criterion-container">
            <h3 className="criterion-number">Criterio {currentEditingCriterion + 1}</h3>

            <input
              type="text"
              value={formData.criterios[currentEditingCriterion].nombrecriterio}
              onChange={(e) => handleCriterionChange('nombrecriterio', e.target.value)}
              className="criterion-name-input"
              placeholder="Inserte el nombre del criterio"  // Placeholder para el criterio
            />

            <table className="rubric-table">
              <thead>
                <tr>
                  <th>Descripción</th>
                  {Array.from({ length: formData.cantidad_columnas }).map((_, index) => (
                    <th key={index}>{index} PTOS</th>  // Placeholder para las columnas
                  ))}
                  <th>PESO (%)</th>
                </tr>
              </thead>
              <tbody>
                {formData.criterios[currentEditingCriterion].subcriterios.map((subcriterio, subIndex) => (
                  <tr
                    key={subIndex}
                    className={selectedRow === subIndex ? "selected-row" : ""}
                    onClick={() => setSelectedRow(subIndex)}
                  >
                    <td>
                      <textarea
                        value={subcriterio.descripcion}
                        onChange={(e) => handleCriterionChange(`subcriterios.${subIndex}.descripcion`, e.target.value)}
                        className="text-box"
                        placeholder="Descripción del subcriterio"  // Placeholder para los subcriterios
                      />
                    </td>
                    {subcriterio.columnas.map((columna, colIndex) => (
                      <td key={colIndex}>
                        <textarea
                          value={columna.textocolumna}
                          onChange={(e) => handleCriterionChange(`subcriterios.${subIndex}.columnas.${colIndex}.textocolumna`, e.target.value)}
                          className="text-box"
                          placeholder={`${colIndex} PTOS`}  // Placeholder para cada columna
                        />
                      </td>
                    ))}
                    <td>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={subcriterio.porcentaje}
                        onChange={(e) => handleCriterionChange(`subcriterios.${subIndex}.porcentaje`, e.target.value)}
                        className="percentage-slider"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={subcriterio.porcentaje}
                        onChange={(e) => handleCriterionChange(`subcriterios.${subIndex}.porcentaje`, e.target.value)}
                        className="percentage-input"
                      /> %
                    </td> 
                  </tr>
                ))} 
              </tbody>
            </table>

            <div className="add-row-buttons">
              <button className="add-button" onClick={addSubcriterion}>+</button>
              <button className="delete-button" onClick={() => removeSubcriterion(formData.criterios[currentEditingCriterion].subcriterios.length - 1)}>-</button>
            </div>
          </div>

          <div className="modify-buttons">
            <button className="modify-button" onClick={handleReturnFromEdit}>Regresar</button>
          </div>
        </>
      )}

    </div>
  );
}

export default ModifyRubric;
