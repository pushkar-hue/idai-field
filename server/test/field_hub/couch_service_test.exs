defmodule FieldHub.CouchServiceTest do
  alias FieldHub.{
    CouchService,
    CouchService.Credentials,
    TestHelper
  }

  use ExUnit.Case, async: true

  @project "test_project"
  @user_name "test_user"
  @user_password "test_password"

  @valid_credentials %Credentials{name: @user_name, password: @user_password}

  setup_all %{} do
    # Run before all tests
    TestHelper.create_test_db_and_user(@project, @user_name, @user_password)

    on_exit(fn ->
      # Run after all tests
      TestHelper.remove_test_db_and_user(@project, @user_name)
    end)
  end

  test "authenticate/1 with valid credentials yields `ok`" do
    result = CouchService.authenticate(@valid_credentials)
    assert :ok = result
  end

  test "authenticate/1 with invalid credentials yields 401" do
    result = CouchService.authenticate(%Credentials{name: @user_name, password: "nope"})
    assert {:error, %HTTPoison.Response{status_code: 401}} = result
  end

  test "authenticate_and_authorize/2 with valid and authorized credentials yields :ok" do
    result = CouchService.authenticate_and_authorize(@valid_credentials, @project)
    assert :ok = result
  end

  test "authenticate_and_authorize/2 with invalid credentials yields 401" do
    result =
      CouchService.authenticate_and_authorize(
        %Credentials{name: @user_name, password: "nope"},
        @project
      )

    assert {:error, %HTTPoison.Response{status_code: 401}} = result
  end

  test "authenticate_and_authorize/2 with valid but unauthorized credentials yields 403" do
    other_project = "other_test_project"
    other_user = "other_user_name"
    TestHelper.create_test_db_and_user(other_project, other_user, "other_password")

    result = CouchService.authenticate_and_authorize(@valid_credentials, other_project)
    assert {:error, %HTTPoison.Response{status_code: 403}} = result

    TestHelper.remove_test_db_and_user(other_project, other_user)
  end

  test "has_project_access/2 returns true for authorized user" do
    assert CouchService.has_project_access?(@user_name, @project)
  end

  test "has_project_access/2 returns false for unauthorized user" do
    assert not CouchService.has_project_access?("unauthorized_user", @project)
  end

  test "get_databases_for_user/1 returns a list of databases" do
    assert [@project] = CouchService.get_databases_for_user(@user_name)
  end

  test "get_databases_for_user/1 for user without any membership returns empty list" do
    assert [] = CouchService.get_databases_for_user("unauthorized_user")
  end
end
