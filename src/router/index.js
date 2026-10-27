import {createWebHistory, createRouter} from "vue-router";
import Login from "@/views/login";
import Home from "@/views/signedIn/home";
import Profile from "@/views/signedIn/profile.vue";
import ChangePassword from "@/views/signedIn/change-password.vue";
import Therapies from "@/views/signedIn/therapies/therapies";
import ViewTherapy from "@/views/signedIn/therapies/view_therapy.vue";
import EnrollPatient from "@/views/signedIn/therapies/enroll-patient.vue";
import AssingRoutine from "@/views/signedIn/therapies/assing-routine.vue";
import NewTherapy from "@/views/signedIn/therapies/new_therapy";
import EditTherapy from "@/views/signedIn/therapies/edit_therapy";
import Routines from "@/views/signedIn/routines/routines";
import NewRoutine from "@/views/signedIn/routines/new_routine";
import EditRoutine from "@/views/signedIn/routines/edit_routine.vue";
import ViewRoutine from "@/views/signedIn/routines/view_routine.vue";
import Exercises from "@/views/signedIn/exercises/exercises";
import NewExercise from "@/views/signedIn/exercises/new_exercise";
import ViewExercise from "@/views/signedIn/exercises/view_exercise.vue";
import EditExercise from "@/views/signedIn/exercises/edit_exercise";
import NewDifficulty from "@/views/signedIn/exercises/new-difficulty.vue";
import View3DViewer from "@/views/signedIn/3d_viewer/index.vue";
import MyPatients from "@/views/signedIn/my-patients/my_patients.vue";
import ViewMyPatients from "@/views/signedIn/my-patients/view_my_patient.vue";
import PatientRoutine from "@/views/signedIn/my-patients/patient_routine.vue";
import ExerciseResult from "@/views/signedIn/my-patients/exercise_result.vue";
import Therapists from "@/views/signedIn/therapists/therapists.vue";
import NewTherapist from "@/views/signedIn/therapists/new_therapist.vue";
import Patients from "@/views/signedIn/patients/patients.vue";
import NewPatient from "@/views/signedIn/patients/new_patient.vue";
import Admins from "@/views/signedIn/admins/admins.vue";
import NewAdmin from "@/views/signedIn/admins/new_admin.vue";
import SignedIn from "@/views/signedIn/signedIn";

const routes = [
    {
        path: "/login",
        name: "login",
        component: Login,
        beforeEnter: (to, from, next) => {
            if (localStorage.getItem("access_token")) {
                next({
                    name: "home",
                });
            } else {
                next();
            }
        },
    },
    {
        path: "/",
        name: "signedIn",
        component: SignedIn,
        meta: {requiresAuth: true},
        children: [
            {
                path: "",
                name: "home",
                component: Home,
                meta: {requiresAuth: true},
            },
            {
                path: "profile",
                name: "profile",
                component: Profile,
                meta: {requiresAuth: true},
            },
            {
                path: "profile/change-password",
                name: "ChangePassword",
                component: ChangePassword,
                meta: {requiresAuth: true},
            },
            {
                path: "therapies",
                name: "therapies",
                component: Therapies,
                meta: {requiresAuth: true},
            },
            {
                path: "therapies/new",
                name: "new_therapy",
                component: NewTherapy,
                meta: {requiresAuth: true},
            },
            {
                path: "therapies/:therapy_id",
                name: "view_therapy",
                component: ViewTherapy,
                meta: {requiresAuth: true},
            },
            {
                path: "therapies/:therapy_id/enroll-patient",
                name: "enroll_patient",
                component: EnrollPatient,
                meta: {requiresAuth: true},
            },
            {
                path: "therapies/:therapy_id/assing-routine",
                name: "assing_routine",
                component: AssingRoutine,
                meta: {requiresAuth: true},
            },
            {
                path: "therapies/:therapy_id/edit",
                name: "edit_therapy",
                component: EditTherapy,
                meta: {requiresAuth: true},
            },
            {
                path: "routines",
                name: "routines",
                component: Routines,
                meta: {requiresAuth: true},
            },
            {
                path: "routines/new",
                name: "new_routine",
                component: NewRoutine,
                meta: {requiresAuth: true},
            },
            {
                path: "routines/:routine_id",
                name: "view_routine",
                component: ViewRoutine,
                meta: {requiresAuth: true},
            },
            {
                path: "routines/:routine_id/edit",
                name: "edit_routine",
                component: EditRoutine,
                meta: {requiresAuth: true},
            },
            {
                path: "exercises",
                name: "exercises",
                component: Exercises,
                meta: {requiresAuth: true},
            },
            {
                path: "exercises/new",
                name: "new_exercise",
                component: NewExercise,
                meta: {requiresAuth: true},
            },
            {
                path: "exercises/:exercise_id",
                name: "view_exercise",
                component: ViewExercise,
                meta: {requiresAuth: true},
            },
            {
                path: "exercises/:exercise_id/edit",
                name: "edit_exercise",
                component: EditExercise,
                meta: {requiresAuth: true},
            },
            {
                path: "exercises/:exercise_id/new-difficulty",
                name: "new_difficulty",
                component: NewDifficulty,
                meta: {requiresAuth: true},
            },
            {
                // E5: el mismo formulario edita una dificultad existente.
                path: "exercises/:exercise_id/difficulties/:difficulty_id/edit",
                name: "edit_difficulty",
                component: NewDifficulty,
                meta: {requiresAuth: true},
            },
            {
                path: "exercises/:exercise_id/3d-viewer",
                name: "view_3d_viewer",
                component: View3DViewer,
                meta: {requiresAuth: true},
            },
            {
                path: "my-patients",
                name: "my-patients",
                component: MyPatients,
                meta: {requiresAuth: true, requestTherapist: true},
            },
            {
                path: "my-patients/:patient_id",
                name: "view_patient",
                component: ViewMyPatients,
                meta: {requiresAuth: true, requestTherapist: true},
            },
            {
                path: "my-patients/:patient_id/routine/:scheduled_training_id",
                name: "view_patient_routine",
                component: PatientRoutine,
                meta: {requiresAuth: true, requestTherapist: true},
            },
            {
                path:
                    "my-patients/:patient_id/routine/:scheduled_training_id/result/:result_id",
                name: "view_exercise_result",
                component: ExerciseResult,
                meta: {requiresAuth: true, requestTherapist: true},
            },
            {
                path: "therapists",
                name: "therapists",
                component: Therapists,
                meta: {requiresAuth: true, requestAdmin: true},
            },
            {
                path: "therapists/new",
                name: "new-therapists",
                component: NewTherapist,
                meta: {requiresAuth: true, requestAdmin: true},
            },
            {
                path: "patients",
                name: "patients",
                component: Patients,
                meta: {requiresAuth: true, requestAdmin: true},
            },
            {
                path: "patients/new",
                name: "new-patient",
                component: NewPatient,
                meta: {requiresAuth: true, requestAdmin: true},
            },
            {
                path: "admins",
                name: "admins",
                component: Admins,
                meta: {requiresAuth: true, requestAdmin: true},
            },
            {
                path: "admins/new",
                name: "new-admin",
                component: NewAdmin,
                meta: {requiresAuth: true, requestAdmin: true},
            },
        ],
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach((to, from, next) => {
    if (to.meta.requiresAuth) {
        if (localStorage.getItem("access_token")) {
            const groups = JSON.parse(localStorage.getItem("groups"));
            if (to.meta.requestTherapist) {
                if (groups.includes("Therapist")) {
                    next();
                    return;
                } else {
                    next({
                        path: "/",
                    });
                    return;
                }
            } else if (to.meta.requestAdmin) {
                if (groups.includes("Admin")) {
                    next();
                    return;
                } else {
                    next({
                        path: "/",
                    });
                    return;
                }
            } else {
                next();
                return;
            }
        } else {
            next({
                name: "login",
            });
            return;
        }
    } else {
        next();
        return;
    }
});

export default router;
