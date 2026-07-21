import { Router, type IRouter } from "express";
import healthRouter from "./health";
import janRouter from "./jan";
import categoriesRouter from "./public/categories";
import productsRouter from "./public/products";
import suggestionsRouter from "./public/suggestions";
import adminAuthRouter from "./admin/auth";
import adminCategoriesRouter from "./admin/categories";
import adminCriteriaRouter from "./admin/criteria";
import adminProductsRouter from "./admin/products";
import adminSuggestionsRouter from "./admin/suggestions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(janRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(suggestionsRouter);
router.use(adminAuthRouter);
router.use(adminCategoriesRouter);
router.use(adminCriteriaRouter);
router.use(adminProductsRouter);
router.use(adminSuggestionsRouter);

export default router;
