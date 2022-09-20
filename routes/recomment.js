const express = require('express');
const router = express.Router();
const { User, Comment, Recomment } = require('../models');
const authMiddleware = require('../middlewares/authMiddlware');
const ErrorCustom = require('../advice/errorCustom');
const recommentSchema = Joi.object({
  comment: Joi.string().required(),
});
// 대댓글 작성
router.post('/:commentKey', authMiddleware, async (req, res, next) => {
  try {
    const { userKey, nickname } = res.locals.user;
    const { commentKey } = req.params;
    const { comment } = req.body;
    const resultSchema = recommentSchema.validate({comment});

    if (resultSchema.error) {
      throw new ErrorCustom(400, '댓글을 입력해주세요.');
    }

    const data = await Comment.findOne({ where: { commentKey } });

    if (!data) {
      throw new ErrorCustom(400, '해당 댓글이 존재하지 않습니다.');
    }

    const newComment = await Recomment.create({
      comment,
      commentKey,
      userKey,
    });

    newComment.updatedAt = newComment.updatedAt.setHours(
      newComment.updatedAt.getHours() + 9
    );

    return res.status(200).json({
      ok: true,
      msg: '대댓글 작성 성공',
      result: {
        recommentKey: newComment.recommentKey,
        comment: newComment.comment,
        nickname: nickname,
        userKey,
        time: newComment.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 해당 게시물 대댓글 모두 조회
router.get('/:commentKey', async (req, res, next) => {
  try {
    const { commentKey } = req.params;

    const data = await Comment.findOne({
      where: { commentKey },
    });

    if (!data) {
      throw new ErrorCustom(400, '해당 대댓글이 존재하지 않습니다.');
    }

    const datas = await Recomment.findAll({
      where: { commentKey },
      include: [{ model: User, attributes: ['nickname'] }],
      order: [['recommentKey', 'ASC']],
    });

    return res.status(200).json({
      ok: true,
      msg: '대댓글 조회 성공',
      result: datas.map((e) => {
        return {
          recommentKey: e.recommentKey,
          comment: e.comment,
          nickname: e.User.nickname,
          userKey: e.userKey,
          time: e.updatedAt,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

// 해당 댓글 수정
router.put('/:recommentKey', authMiddleware, async (req, res, next) => {
  try {
    const { userKey, nickname } = res.locals.user;
    const { recommentKey } = req.params;
    const { comment } = req.body;

    const resultSchema = recommentSchema.validate({comment});

    if (resultSchema.error) {
      throw new ErrorCustom(400, '대댓글을 입력해주세요.');
    }
    // if (comment.length > 200) {
    // throw new ErrorCustom(400, '댓글은 200자 이내로 작성 가능합니다.');
    // }

    const data = await Recomment.findOne({
      where: { recommentKey },
    });

    if (!data) {
      throw new ErrorCustom(400, '해당 대댓글이 존재하지 않습니다.');
    }

    if (userKey !== data.userKey) {
      throw new ErrorCustom(400, '작성자가 다릅니다.');
    } else {
      await Recomment.update({ comment }, { where: { recommentKey, userKey } });

      const updateComment = await Recomment.findOne({
        where: { recommentKey },
      });

      return res.status(200).json({
        ok: true,
        msg: '대댓글 수정 성공',
        result: {
          recommentKey: data.recommentKey,
          comment: comment,
          nickname: nickname,
          userKey,
          time: updateComment.updatedAt,
        },
      });
    }
  } catch (err) {
    next(err);
  }
});

// 대댓글 삭제
router.delete('/:recommentKey', authMiddleware, async (req, res, next) => {
  try {
    const { userKey, nickname } = res.locals.user;
    const { recommentKey } = req.params;

    const data = await Recomment.findOne({ where: { recommentKey } });

    if (!data) {
      throw new ErrorCustom(400, '해당 대댓글이 존재하지 않습니다.');
    }

    if (userKey !== data.userKey) {
      throw new ErrorCustom(400, '작성자가 다릅니다.');
    } else {
      await Recomment.destroy({ where: { recommentKey, userKey } });

      return res.status(200).json({
        ok: true,
        msg: '대댓글 삭제 성공',
        result: {
          recommentKey: data.recommentKey,
          comment: data.comment,
          nickname: nickname,
          userKey,
        },
      });
    }
  } catch (err) {
    next(err);
  }
});


module.exports = router;
