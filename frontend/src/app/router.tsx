import { createBrowserRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';
import { HuntPage } from '../pages/HuntPage';
import { CardsPage } from '../pages/CardsPage';
import { Layout } from './Layout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Layout>
        <DashboardPage />
      </Layout>
    ),
  },
  {
    path: '/hunt',
    element: (
      <Layout>
        <HuntPage />
      </Layout>
    ),
  },
  {
    path: '/cards',
    element: (
      <Layout>
        <CardsPage />
      </Layout>
    ),
  },
  {
    path: '/alerts',
    element: (
      <Layout>
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">🔔 Alerts</h1>
            <p className="text-gray-600">Alerts page coming soon</p>
          </div>
        </div>
      </Layout>
    ),
  },
]);
