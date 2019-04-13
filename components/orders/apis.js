const { Router } = require('express');
const Order = require('./order');
const UserCart = require('../carts/cart');
const Product = require('../products/product');


/**
 * Base Path: /orders
 *  Login Required.
 */
const router = Router();

function renderHelperMiddleware(req, res, next) {
  res.locals.toRender.title = 'Orders';
  next();
}

function requireAuthorization(req, res, next) {
  if (!req.session.userId) {
    req.session.lastPosition = req.originalUrl;
    res.redirect('/auths/login');
  } else {
    next();
  }
}

router.use(requireAuthorization);
router.use(renderHelperMiddleware);

/**
 * Get user's order list
 */
router.get('/', (req, res, next) => {
  Order.get({ userId: req.session.userId })
    .then((orders) => {
      res.render('orders', { orders, ...res.locals.toRender });
    })
    .catch(err => next(err));
});

/**
 * Get checkout page
 */
router.get('/checkout', (req, res, next) => {
  // get cart items and set.
  res.render('checkout', { orders: req.session.carts, ...res.locals.toRender });
});

/**
 * Post check out the products
 */
router.post('/checkout', (req, res, next) => {
  // Add integration with third party payment system
  // const callPaymentSystem = new Promise((resolve, reject) => resolve(true));
  // const callShipmentSystem = new Promise((resolve, reject) => resolve(true));
  // callPaymentSystem()
  //   .then(callShipmentSystem()
  //     .then())
  const order = {
    userId: req.session.userId,
    products: req.session.carts,
    totalPrice: req.session.cartsTotalPrice,
    payment: {
      method: req.body.payment,
      processed: Date.now(),
    },
    shipment: {
      method: req.body.shipment,
    },
  };

  // Add to Order collection
  Order.add(order)
    .then(() => {
      // Delete usercart from db
      UserCart.remove({ userId: req.session.userId })
        .then(() => {
          req.session.carts = [];
          res.redirect('/orders');
        });
    })
    .catch(err => next(err));
});


/**
 * Redirect to product page
 */
router.get('/:productUid', (req, res, next) => {
  res.redirect(`/categories/all/${req.params.productUid}`);
});

/**
 * Post direct order
 */
router.post('/:productUid', (req, res, next) => {
  const { productUid } = req.params;
  const quantity = parseInt(req.body.quantity, 10);
  const { productId, option } = req.body;
  Product.getOne({ uid: productUid })
    .then((product) => {
      // set to session cart
      req.session.carts = [{
        productId,
        productUid,
        option,
        quantity,
        productInfo: product,
      }];
      res.render('checkout', { orders: req.session.carts, ...res.locals.toRender });
    })
    .catch(err => next(err));
});


module.exports = router;