import React, { useState, useEffect } from 'react';
import './RubricStatistics.css'; // Estilos del modal para las estadísticas

function RubricStatistics({ rubricaId, onClose }) {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Obtener estadísticas de la rúbrica
  useEffect(() => {
    fetch(`http://localhost:5000/rubrica/${rubricaId}/statistics`)
      .then(response => response.json())
      .then(data => {
        console.log(data.top5); // Aquí puedes ver la estructura de los datos para depurar
        setStatistics(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Error al cargar estadísticas');
        setLoading(false);
      });
  }, [rubricaId]);

  if (loading) return <p>Cargando estadísticas...</p>;
  if (error) return <p>{error}</p>;

  // Verifica si los valores existen y son numéricos antes de formatearlos
  const formatearNumero = (numero) => {
    const valorNumerico = parseFloat(numero); // Convierte cadenas a números
    return (!isNaN(valorNumerico)) ? valorNumerico.toFixed(2) : 'N/A';
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Estadísticas de la Rúbrica</h2>
        <p><strong>Cantidad de usos:</strong> {statistics.estadisticas.usos || 'N/A'}</p>
        <p><strong>Promedio:</strong> {formatearNumero(statistics.estadisticas.promedio)}</p>
        <p><strong>Mediana:</strong> {formatearNumero(statistics.estadisticas.mediana)}</p>
        <p><strong>Nota mínima:</strong> {formatearNumero(statistics.estadisticas.nota_minima)}</p>
        <p><strong>Nota máxima:</strong> {formatearNumero(statistics.estadisticas.nota_maxima)}</p>

        <h3>Top 5 Rúbricas más usadas</h3>
        <ul>
          {statistics.top5.map((rubrica, index) => (
            <li key={rubrica.rubrica_id}>
              {index + 1}. Rúbrica {rubrica.titulo}: {rubrica.usos} usos
            </li>
          ))}
        </ul>

        <button onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}

export default RubricStatistics;
