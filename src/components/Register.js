import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Register.css';

function Register() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    correo: '',
    contraseña: '',
  });

  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // Validar que la contraseña tenga al menos 5 caracteres
    if (formData.contraseña.length < 5) {
      setErrorMessage('La contraseña debe tener al menos 5 caracteres.');
      return;
    }
  
    try {
      const response = await fetch('http://localhost:5000/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        // Redirigir a la página de inicio con un mensaje de éxito
        navigate('/', { state: { successMessage: '¡Se ha creado su cuenta exitosamente!' } });
      } else {
        setErrorMessage(data.error || 'Error al registrarse.');
      }
    } catch (error) {
      setErrorMessage('Hubo un error al conectar con el servidor.');
    }
  };
  
  
  return (
    <div className="register-container">
      {/* Mostrar mensaje de error ARRIBA de la caja de registro */}
      {errorMessage && <div className="error-message">{errorMessage}</div>}
      
      <div className="register-box">
        <div className="register-header">
          <h2>Registrarse</h2>
        </div>

        <div className="register-body">
          <form onSubmit={handleSubmit}>
            <label htmlFor="nombre">Nombre</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              placeholder="Ingrese su nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
            />

            <label htmlFor="apellido">Apellido</label>
            <input
              type="text"
              id="apellido"
              name="apellido"
              placeholder="Ingrese su apellido"
              value={formData.apellido}
              onChange={handleChange}
              required
            />

            <label htmlFor="correo">Correo</label>
            <input
              type="email"
              id="correo"
              name="correo"
              placeholder="Ingrese su correo"
              value={formData.correo}
              onChange={handleChange}
              required
            />

            <label htmlFor="contraseña">Contraseña</label>
            <input
              type="password"
              id="contraseña"
              name="contraseña"
              placeholder="Ingrese su contraseña"
              value={formData.contraseña}
              onChange={handleChange}
              required
            />

            <button type="submit">Aceptar</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Register;
