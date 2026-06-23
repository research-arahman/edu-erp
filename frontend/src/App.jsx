import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Institutes from './pages/Institutes';
import Programs from './pages/Programs';
import Applications from './pages/Applications';
import Candidates from './pages/Candidates';
import Employers from './pages/Employers';
import Jobs from './pages/Jobs';
import JobApplications from './pages/JobApplications';
import Countries from './pages/Countries';
import Industries from './pages/Industries';
import Inquiries from './pages/Inquiries';
import Tasks from './pages/Tasks';
import Accounting from './pages/Accounting';
import AdmissionTemplates from './pages/AdmissionTemplates';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="institutes" element={<Institutes />} />
          <Route path="programs" element={<Programs />} />
          <Route path="admission-templates" element={<AdmissionTemplates />} />
          <Route path="applications" element={<Applications />} />
          <Route path="candidates" element={<Candidates />} />
          <Route path="employers" element={<Employers />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="job-applications" element={<JobApplications />} />
          <Route path="countries" element={<Countries />} />
          <Route path="industries" element={<Industries />} />
          <Route path="inquiries" element={<Inquiries />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="accounting" element={<Accounting />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
