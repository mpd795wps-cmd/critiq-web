import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
<<<<<<< HEAD
import janRouter from "./jan";
import uploadRouter from "./upload";
import categoriesRouter from "./public/categories";
import criteriaRouter from "./public/criteria";
import productsRouter from "./public/products";
import suggestionsRouter from "./public/suggestions";
import fetchUrlRouter from "./public/fetchUrl";
import authRouter from "./auth";
import userRouter from "./user";
import adminAuthRouter from "./admin/auth";
import adminCategoriesRouter from "./admin/categories";
import adminCriteriaRouter from "./admin/criteria";
import adminProductsRouter from "./admin/products";
import adminSuggestionsRouter from "./admin/suggestions";
import adminUsersRouter from "./admin/users";
import adminCategorySuggestionsRouter from "./admin/categorySuggestions";
=======
import janRouter from "./jan.js";
import uploadRouter from "./upload.js";
import categoriesRouter from "./public/categories.js";
import criteriaRouter from "./public/criteria.js";
import productsRouter from "./public/products.js";
import suggestionsRouter from "./public/suggestions.js";
import fetchUrlRouter from "./public/fetchUrl.js";
import authRouter from "./auth.js";
import userRouter from "./user.js";
import adminAuthRouter from "./admin/auth.js";
import adminCategoriesRouter from "./admin/categories.js";
import adminCriteriaRouter from "./admin/criteria.js";
import adminProductsRouter from "./admin/products.js";
import adminSuggestionsRouter from "./admin/suggestions.js";
import adminUsersRouter from "./admin/users.js";
import adminCategorySuggestionsRouter from "./admin/categorySuggestions.js";
>>>>>>> fix/vercel-neon-integration

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
router.use(userRouter);
router.use(adminAuthRouter);
router.use(adminCategoriesRouter);
router.use(adminCriteriaRouter);
router.use(adminProductsRouter);
router.use(adminSuggestionsRouter);
router.use(adminUsersRouter);
router.use(adminCategorySuggestionsRouter);

export default router;
