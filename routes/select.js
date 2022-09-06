const express = require('express');
const router = express.Router();
const { Select, User, Vote } = require('../models');
const authMiddleware = require('../middlewares/authMiddlware');
const { Op } = require('sequelize');
const ErrorCustom = require('../advice/errorCustom');
const upload = require('../middlewares/multer');

// 선택글 작성
router.post(
  '/',
  authMiddleware,
  upload.array('image', 4),
  async (req, res, next) => {
    try {
      const { userKey, nickname } = res.locals.user;
      const { title, category, time, options } = req.body;
      const image = req.files;

      if (title === '' || category === '' || time === '' || options === '') {
        throw new ErrorCustom(400, '항목들을 모두 입력해주세요.');
      }

      // 이미지는 들어가면 최소 2개이상(선택지갯수에 맞게), 없을수도 있음
      let location = [];
      if (image !== undefined) {
        location = image.map((e) => e.location);
      }

      const date = new Date();
      const deadLine = date.setHours(date.getHours() + time);

      const data = await Select.create({
        title,
        category,
        content: null,
        image: location,
        deadLine,
        options,
        userKey,
        completion: false,
        finalChoice: 0,
      });

      // db 저장시간과 보여지는 시간이 9시간 차이가 나서 보여주는것은 9시간을 더한것을 보여준다. 이후 db에서 가져오는 dealine은 정상적인 한국시간
      data.deadLine = date.setHours(date.getHours() + 9);

      return res.status(200).json({
        ok: true,
        msg: '선택글 작성 성공',
        result: {
          selectKey: data.selectKey,
          title: data.title,
          category: data.category,
          deadLine: data.deadLine,
          completion: data.completion,
          nickname: nickname,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// 선택글 모두 조회
router.get('/', async (req, res, next) => {
  try {
    let offset = 0;
    const limit = 5;
    const pageNum = req.query.page;

    if (pageNum > 1) {
      offset = limit * (pageNum - 1); //5 10
    }

    const datas = await Select.findAll({
      include: [{ model: User, attributes: ['nickname'] }, { model: Vote }],
      order: [['selectKey', 'DESC']],
      offset: offset,
      limit: limit,
    });
    // console.log(datas[0].Votes.length);

    const now = new Date();

    return res.status(200).json({
      ok: true,
      msg: '선택글 모두 조회 성공',
      result: datas.map((e) => {
        return {
          selectKey: e.selectKey,
          title: e.title,
          category: e.category,
          deadLine: e.deadLine,
          completion: now > new Date(e.deadLine),
          nickname: e.User.nickname,
          options: e.options,
          total: e.Votes.length,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

//선택글 정렬(인기순)
router.get('/filter', async (req, res, next) => {
  try {
    let offset = 0;
    const limit = 5;
    const pageNum = req.query.page;

    if (pageNum > 1) {
      offset = limit * (pageNum - 1); //5 10
    }

    const datas = await Select.findAll({
      include: [{ model: User, attributes: ['nickname'] }, { model: Vote }],
      offset: offset,
      limit: limit,
    });

    const now = new Date();

    const popular = datas.map((e) => ({
      total: e.Votes.length,
      selectKey: e.selectKey,
      title: e.title,
      category: e.category,
      deadLine: e.deadLine,
      completion: now > new Date(e.deadLine),
      nickname: e.User.nickname,
      options: e.options,
    }));

    popular.sort(function (a, b) {
      return b.total - a.total;
    });

    res.status(201).json({
      msg: '인기글이 조회되었습니다.',
      data: popular,
    });
  } catch (err) {
    next(err);
  }
});

//선택글 카테고리별 조회
router.get('/category/:category', async (req, res, next) => {
  try {
    let offset = 0;
    const limit = 5;
    const pageNum = req.query.page;

    if (pageNum > 1) {
      offset = limit * (pageNum - 1); //5 10
    }

    const { category } = req.params;

    const data = await Select.findAll({
      where: { [Op.or]: [{ category: { [Op.like]: `%${category}%` } }] },
      include: [{ model: User, attributes: ['nickname'] }, { model: Vote }],
      offset: offset,
      limit: limit,
    });

    if (!data) {
      throw new ErrorCustom(400, '해당 카테고리에 글이 존재하지 않습니다.');
    }

    const now = new Date();

    res.status(200).json({
      msg: '카테고리 조회 성공',
      result: data.map((c) => {
        return {
          selectKey: c.selectKey,
          title: c.title,
          category: c.category,
          deadLine: c.deadLine,
          completion: now > new Date(c.deadLine),
          nickname: c.User.nickname,
          options: c.options,
          total: c.Votes.length,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

// 선택글 상세조회
router.get('/:selectKey', async (req, res, next) => {
  try {
    const { selectKey } = req.params;
    const data = await Select.findOne({
      where: { selectKey },
      include: [{ model: User, attributes: ['nickname'] }],
    });

    if (!data) {
      throw new ErrorCustom(400, '해당 선택글이 존재하지 않습니다.');
    }

    // 현재 시간과 마감시간을 비교함(둘다 9시간 차이가 나서 바로 비교해도 됨)
    const now = new Date();
    const dead = new Date(data.deadLine);

    return res.status(200).json({
      ok: true,
      msg: '선택글 상세 조회 성공',
      result: {
        selectKey: data.selectKey,
        title: data.title,
        category: data.category,
        image: data.image,
        deadLine: data.deadLine,
        options: data.options,
        completion: now > dead,
        userKey: data.userKey,
        nickname: data.User.nickname,
        finalChoice: data.finalChoice,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 선택글 삭제
router.delete('/:selectKey', authMiddleware, async (req, res, next) => {
  try {
    const { userKey, nickname } = res.locals.user;
    const { selectKey } = req.params;
    const data = await Select.findOne({ where: { selectKey } });

    if (!data) {
      throw new ErrorCustom(400, '해당 선택글이 존재하지 않습니다.');
    }

    if (userKey !== data.userKey) {
      throw new ErrorCustom(400, '작성자가 일치하지 않습니다.');
    }

    await Select.destroy({ where: { selectKey } });

    return res.status(200).json({
      ok: true,
      msg: '선택글 삭제 성공',
      result: {
        selectKey: data.selectKey,
        title: data.title,
        category: data.category,
        deadLine: data.deadLine,
        completion: data.completion,
        nickname: nickname,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
