import { Router, type IRouter } from "express";
import healthRouter from "./health";
import janRouter from "./jan";
import uploadRouter from "./upload";
import categoriesRouter from "./public/categories";
import criteriaRouter from "./public/criteria";
import productsRouter from "./public/products";
import suggestionsRouter from "./public/suggestions";
import fetchUrlRouter from "./public/fetchUrl";
import authRouter from "./auth";
import adminAuthRouter from "./admin/auth";
import adminCategoriesRouter from "./admin/categories";
import adminCriteriaRouter from "./admin/criteria";
import adminProductsRouter from "./admin/products";
import adminSuggestionsRouter from "./admin/suggestions";
import adminUsersRouter from "./admin/users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(janRouter);
router.use(uploadRouter);
router.use(categoriesRouter);
router.use(criteriaRouter);
router.use(productsRouter);
router.use(suggestionsRouter);
router.use(fetchUrlRouter);
router.use(authRouter);
router.use(adminAuthRouter);
router.use(adminCategoriesRouter);
router.use(adminCriteriaRouter);
router.use(adminProductsRouter);
router.use(adminSuggestionsRouter);
router.use(adminUsersRouter);

export default router;
