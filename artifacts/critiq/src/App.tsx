import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { useEffect } from 'react';
import { api } from '@/lib/api';
import Home from '@/pages/Home';
import Explore from '@/pages/Explore';
import Category from '@/pages/Category';
import Results from '@/pages/Results';
import Grow from '@/pages/Grow';
import ProductDetail from '@/pages/ProductDetail';
import GrowRating from '@/pages/grow/Rating';
import RatingDirect from '@/pages/grow/RatingDirect';
import GrowProduct from '@/pages/grow/ProductRegistration';
import GrowCriterion from '@/pages/grow/CriterionSuggestion';
import NotFound from '@/pages/NotFound';
import Register from '@/pages/auth/Register';
import Login from '@/pages/auth/Login';
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminProducts from '@/pages/admin/AdminProducts';
import AdminCriteria from '@/pages/admin/AdminCriteria';
import AdminCategories from '@/pages/admin/AdminCategories';
import AdminCriterionSuggestions from '@/pages/admin/AdminCriterionSuggestions';
import AdminProductSuggestions from '@/pages/admin/AdminProductSuggestions';
import AdminCategorySuggestions from '@/pages/admin/AdminCategorySuggestions';
import AdminUsers from '@/pages/admin/AdminUsers';
import TentDiagnosis from '@/pages/TentDiagnosis';
import AdminTentDiagnosis from '@/pages/admin/AdminTentDiagnosis';

const ADMIN_LAST_PATH_KEY = 'critiq_admin_last_path';

// Safariがバックグラウンドでリロードして / に戻った際に管理画面へ自動復帰
function AdminSessionRestorer() {
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (location !== '/') return;
    const savedPath = localStorage.getItem(ADMIN_LAST_PATH_KEY);
    if (!savedPath || !savedPath.startsWith('/admin')) return;

    api.admin.me()
      .then(() => navigate(savedPath))
      .catch(() => localStorage.removeItem(ADMIN_LAST_PATH_KEY));
  }, []); // 初回マウント時のみ

  return null;
}

function Router() {
  return (
    <>
    <AdminSessionRestorer />
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/explore" component={Explore} />
      <Route path="/diagnosis/tents" component={TentDiagnosis} />
      <Route path="/explore/:categorySlug/results" component={Results} />
      <Route path="/explore/:categorySlug" component={Category} />
      <Route path="/grow" component={Grow} />
      <Route path="/grow/rating/:productId" component={RatingDirect} />
      <Route path="/grow/rating" component={GrowRating} />
      <Route path="/grow/product" component={GrowProduct} />
      <Route path="/grow/criterion" component={GrowCriterion} />
      <Route path="/product/:productId" component={ProductDetail} />
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/tent-diagnosis" component={AdminTentDiagnosis} />
      <Route path="/admin/criteria" component={AdminCriteria} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/suggestions/criteria" component={AdminCriterionSuggestions} />
      <Route path="/admin/suggestions/products" component={AdminProductSuggestions} />
      <Route path="/admin/suggestions/categories" component={AdminCategorySuggestions} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
    </>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Router />
    </WouterRouter>
  );
}

export default App;
