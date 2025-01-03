import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ roles, userId }) => {
  const location = useLocation(); // Hook para obtener la ubicación actual

  const getNavbarOptions = (roles = []) => {
    const options = []; // Inicializa opciones

    if (roles.includes('Administrador')) {
      options.push('Listar rúbricas públicas', 'Listar rúbricas creadas', 'Crear rúbricas', 'Listar rúbricas disponibles', 'Liberar Propuestas');
    } else if (roles.includes('Creador')) {
      options.push('Listar rúbricas públicas', 'Crear rúbricas', 'Listar rúbricas creadas');
    }

    if (roles.includes('Evaluador')) {
      options.push('Listar rúbricas públicas', 'Evaluar propuestas');
    }

    if (roles.includes('Consultor')) {
      options.push('Listar rúbricas públicas');
    }

    return options;
  };

  const options = getNavbarOptions(roles); // Usa roles para obtener las opciones

  const getRouteForOption = (option) => {
    switch (option) {
      case 'Listar rúbricas públicas':
        return '/rubrics/show_rubrics';
      case 'Crear rúbricas':
        return '/rubrics/create';
      case 'Listar rúbricas creadas':
        return '/rubrics/show_created_rubrics';
      case 'Listar rúbricas disponibles':
        return '/rubrics/show_available_rubrics';
      case 'Evaluar propuestas':
        return '/rubrics/show_evaluation';
      case 'Liberar Propuestas':
        return '/rubrics/release_proposals';
      default:
        return '';
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <span>Módulo de Rúbricas</span>
      </div>
      <div className="navbar-right">
        {options.map((option, index) => {
          const route = getRouteForOption(option);

          return (
            <Link
              key={index}
              to={route}
              state={{ roles, userId }}
              className={location.pathname === route ? 'active' : ''} // Verifica si la ruta actual coincide
            >
              {option}
            </Link>
          );
        })}

        {roles.includes('Administrador') && (
          <div className="dropdown">
            <span className="dropdown-toggle">Asignación</span>
            <div className="dropdown-menu">
              <Link to="/assign_rubric" state={{ roles, userId }}>
                Asignar Rúbrica
              </Link>
              <Link to="/assign_evaluator" state={{ roles, userId }}>
                Asignar Evaluador
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
