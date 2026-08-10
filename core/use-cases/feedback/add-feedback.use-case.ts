import { IFeedbackRepository, CreateFeedbackDTO } from '../../repositories/i-feedback-repository';

export class AddTimecodedFeedbackUseCase {
  constructor(private readonly feedbackRepo: IFeedbackRepository) {}

  async execute(dto: CreateFeedbackDTO) {
    if (!dto.commentText || dto.commentText.trim().length === 0) {
      throw new Error('Feedback comment cannot be empty.');
    }

    if (!dto.assetVersionId) {
      throw new Error('Asset version ID is required.');
    }

    if (dto.timestampSeconds !== undefined && dto.timestampSeconds < 0) {
      throw new Error('Timestamp cannot be negative.');
    }

    return await this.feedbackRepo.create({
      ...dto,
      commentText: dto.commentText.trim(),
      authorName: dto.authorName?.trim() || 'Guest',
    });
  }
}
