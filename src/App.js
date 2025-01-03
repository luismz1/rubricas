// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import CreateRubric from './components/CreateRubric';
import EvaluateRubric from './components/EvaluateRubric';
import ShowRubrics from './components/ShowRubrics';
import ShowCreatedRubrics from './components/ShowCreatedRubrics'
import ShowAvailableRubrics from './components/ShowAvailableRubrics';
import ModifyRubric from './components/ModifyRubric';
import AssignRubric from './components/AssignRubric';
import AssignEvaluator from './components/AssignEvaluator';
import ShowEvaluation from './components/ShowEvaluations';
import ReleaseProposals from './components/ReleaseProposals';

function App() {
  return (
      <Router>
        <Routes>
          {/* Ruta para el login */}
          <Route path="/" element={<Login />} />
          {/* Ruta para el registro */}
          <Route path="/register" element={<Register />} />
          <Route path="/rubrics/create" element={<CreateRubric />} />
          <Route path="/rubrics/evaluate/:id" element={<EvaluateRubric />} />
          <Route path="/rubrics/show_rubrics" element={<ShowRubrics />} />
          <Route path="/rubrics/show_created_rubrics" element={<ShowCreatedRubrics />} />
          <Route  path='/rubrics/show_available_rubrics' element={<ShowAvailableRubrics/>}/>
          <Route path="/rubrics/modify/:id" element={<ModifyRubric />} />
          <Route path="/assign_rubric" element={<AssignRubric />} />
          <Route path="/assign_evaluator" element={<AssignEvaluator />} />
          <Route path="/rubrics/show_evaluation" element={<ShowEvaluation />} />
          <Route path="/rubrics/release_proposals" element={<ReleaseProposals />} />
        </Routes>
      </Router>
  );
}

export default App;
