export interface LectureSummary {
  _id: string;
  title: string;
  duration?: number;
  videoUrl?: string;
}

export interface CourseSummary {
  _id: string;
  courseTitle: string;
  subTitle?: string;
  category?: string;
  courseLevel?: string;
  coursePrice?: number;
  isPublished?: boolean;
  lectures?: LectureSummary[];
}
