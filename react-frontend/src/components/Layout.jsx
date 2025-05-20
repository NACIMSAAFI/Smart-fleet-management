import { Outlet } from 'react-router-dom';
import TopNavBar from './TopNavBar';

const Layout = () => (
  <>
    <TopNavBar />
    <main className="content-container">
      <Outlet />
    </main>
  </>
);

export default Layout;