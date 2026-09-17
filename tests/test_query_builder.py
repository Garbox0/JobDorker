import sys
import unittest
from pathlib import Path


APP_DIR = Path(__file__).resolve().parents[1] / "JobDorker_MVP_v2"
sys.path.insert(0, str(APP_DIR))

from JobDorker import build_dorks, build_google_url, compose_tokens  # noqa: E402


class QueryBuilderTests(unittest.TestCase):
    def test_google_url_keeps_language_and_recency_filters(self):
        url = build_google_url("data analyst", "Inglés", "Últimas 24 h")

        self.assertIn("q=data+analyst", url)
        self.assertIn("lr=lang_en", url)
        self.assertIn("tbs=qdr:d", url)

    def test_exploration_mode_relaxes_seniority_and_language(self):
        tokens = compose_tokens(
            "DevOps", "IT / Tecnología", "Senior", "Inglés", "Argentina",
            "Remoto", True, False, "USD", modo_exploracion=True,
        )
        joined = " ".join(tokens)

        self.assertIn('"devops"', joined)
        self.assertNotIn('"senior"', joined)
        self.assertNotIn('"english"', joined)
        self.assertIn("-internship", joined)

    def test_each_job_board_gets_a_search_url(self):
        boards = [("Greenhouse", "site:boards.greenhouse.io"), ("Lever", "site:jobs.lever.co")]
        dorks = build_dorks(
            "Frontend", "", "Cualquiera", "Cualquiera", "Remoto", "Remoto",
            "Cualquiera", True, False, "USD", False, boards,
        )

        self.assertEqual(2, len(dorks))
        self.assertEqual("Greenhouse", dorks[0][0])
        self.assertIn("site:boards.greenhouse.io", dorks[0][1])
        self.assertTrue(dorks[0][2].startswith("https://www.google.com/search?"))


if __name__ == "__main__":
    unittest.main()
