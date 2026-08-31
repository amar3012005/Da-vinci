import apiClient from './api-client';

describe('durable image upload', () => {
  test('polls the canonical upload job and returns its memory id', async () => {
    const file = new File(['image'], 'mobile.jpg', { type: 'image/jpeg' });
    const upload = jest.spyOn(apiClient, 'uploadDocument').mockResolvedValue({
      documentId: 'memory-1', promotedCount: 1, job_id: 'job-1', ingestMode: 'both',
    });

    await expect(apiClient.uploadImage(file, { projectId: 'project-1', hint: 'mobile photo' }))
      .resolves.toMatchObject({ memory_id: 'memory-1', memory_ids: ['memory-1'], job_id: 'job-1' });
    expect(upload).toHaveBeenCalledWith(file, expect.objectContaining({
      ingestMode: 'both', targetScope: 'project', projectId: 'project-1', hint: 'mobile photo',
    }));
    upload.mockRestore();
  });
});
