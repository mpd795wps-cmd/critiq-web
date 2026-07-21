import { Route, Switch, Router as WouterRouter } from 'wouter';
import Home from '@/pages/Home';
import Explore from '@/pages/Explore';
import Category from '@/pages/Category';
import Results from '@/pages/Results';
import Grow from '@/pages/Grow';
import ProductDetail from '@/pages/ProductDetail';
import GrowRating from '@/pages/grow/Rating';
import GrowProduct from '@/pages/grow/ProductRegistration';
import GrowCriterion from '@/pages/grow/CriterionSuggestion';
import NotFound from '@/pages/NotFound';

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/explore" component={Explore} />
      <Route path="/explore/:categoryId/results" component={Results} />
      <Route path="/explore/:categoryId" component={Category} />
      <Route path="/grow" component={Grow} />
      <Route path="/grow/rating" component={GrowRating} />
      <Route path="/grow/product" component={GrowProduct} />
      <Route path="/grow/criterion" component={GrowCriterion} />
      <Route path="/product/:productId" component={ProductDetail} />
      <Route component={NotFound} />
    </Switch>
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
