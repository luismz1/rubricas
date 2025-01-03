import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);
  

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);
  

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ correo: email, contraseña: password }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        // Guarda el ID del usuario y los roles en el estado de navegación
        const rolesResponse = await fetch(`http://localhost:5000/roles/${data.usuarioId}`);
        const roles = await rolesResponse.json();
        // Navegar con el userId y los roles
        navigate('/rubrics/show_rubrics', { state: { roles, userId: data.usuarioId } });
      } else {
        setErrorMessage(data.error || 'Correo o contraseña incorrecto.');
      }
    } catch (error) {
      setErrorMessage('Hubo un error al conectar con el servidor.');
    }
  };
  
  return (
    <div className="login-page">
      {successMessage && <div className="success-message">{successMessage}</div>}
      {errorMessage && <div className="error-message">{errorMessage}</div>}
      
      <div className="login-container">
        <div className="login-box">
          <div className="login-header">
            <h2>Iniciar Sesión</h2>
          </div>

          <div className="login-body">
            <form onSubmit={handleSubmit}>
              <label htmlFor="email">Correo</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Ingrese su correo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <label htmlFor="password">Contraseña</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Ingrese su contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button type="submit">Iniciar Sesión</button>
            </form>
          </div>
          <div className="login-footer">
            <p>
              ¿No tienes cuenta? <a href="/register">Registrarse</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
